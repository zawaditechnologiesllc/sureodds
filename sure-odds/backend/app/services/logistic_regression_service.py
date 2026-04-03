"""
Logistic Regression Weight Fitting Service — Priority 2.

Trains on settled predictions (minimum 300) to learn which input features
are most predictive of a correct pick, then derives optimal mixing weights
to replace the hardcoded 50/50 Poisson/strength and 55/30/15 form/H2H/home
splits in the prediction engine.

Training features (all stored per prediction):
  - home_form_score  : home team's venue-specific recency form [0, 1]
  - away_form_score  : away team's venue-specific recency form [0, 1]
  - h2h_adv_score    : head-to-head historical advantage [-1, 1]
  - home_xg          : Poisson expected goals for home team
  - away_xg          : Poisson expected goals for away team

Target: is_correct (1 = prediction was correct, 0 = incorrect)

Output: derived mixing weights stored in the model_weights table.
The prediction engine reads these weights at prediction time.

This job runs weekly. It requires MIN_SAMPLES settled predictions that also
have the v3 feature columns populated (home_form_score etc.). Since these
columns are new, the job will silently skip until enough data accumulates.
"""

import logging
from sqlalchemy.orm import Session
from app.models.models import Prediction, ModelWeights

logger = logging.getLogger(__name__)

MIN_SAMPLES = 300   # Need enough history before fitting is meaningful


def train_model_weights(db: Session) -> dict:
    """
    Fit logistic regression on settled predictions and store derived
    mixing weights in the model_weights table.

    Returns a summary dict for logging.
    """
    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import cross_val_score
        import numpy as np
    except ImportError:
        logger.error("scikit-learn not installed. Run: pip install scikit-learn")
        return {"skipped": True, "reason": "scikit-learn not available"}

    rows = (
        db.query(Prediction)
        .filter(
            Prediction.actual_result.isnot(None),
            Prediction.home_form_score.isnot(None),
            Prediction.away_form_score.isnot(None),
            Prediction.h2h_adv_score.isnot(None),
            Prediction.home_xg.isnot(None),
            Prediction.away_xg.isnot(None),
        )
        .all()
    )

    n = len(rows)
    if n < MIN_SAMPLES:
        logger.info(
            f"LR training: only {n} settled predictions with feature data "
            f"(need {MIN_SAMPLES}). Skipping."
        )
        return {"skipped": True, "total_with_features": n, "need": MIN_SAMPLES}

    X = np.array([
        [
            r.home_form_score,
            r.away_form_score,
            r.h2h_adv_score,
            r.home_xg,
            r.away_xg,
        ]
        for r in rows
    ])
    y = np.array([1 if r.is_correct else 0 for r in rows])

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    clf = LogisticRegression(max_iter=1000, random_state=42)
    clf.fit(X_scaled, y)

    # 5-fold cross-validation accuracy (measures predictive quality)
    cv_scores = cross_val_score(clf, X_scaled, y, cv=5, scoring="accuracy")
    cv_accuracy = float(cv_scores.mean())

    # Raw coefficients (scaled — comparable to each other)
    # Features: [home_form, away_form, h2h_adv, home_xg, away_xg]
    coefs = clf.coef_[0]
    abs_coefs = [abs(c) for c in coefs]

    form_signal   = (abs_coefs[0] + abs_coefs[1]) / 2   # avg of home_form + away_form
    h2h_signal    = abs_coefs[2]
    poisson_signal = (abs_coefs[3] + abs_coefs[4]) / 2  # avg of home_xg + away_xg

    # -------------------------------------------------------------------------
    # Derive Poisson vs Strength blend
    # -------------------------------------------------------------------------
    # Poisson component = xG-based features
    # Strength component = form + H2H features
    total_signal = poisson_signal + form_signal + h2h_signal

    if total_signal > 0:
        raw_poisson_w  = poisson_signal / total_signal
        raw_strength_w = (form_signal + h2h_signal) / total_signal
    else:
        raw_poisson_w  = 0.50
        raw_strength_w = 0.50

    # Soft-cap each weight between 30% and 70% to prevent extreme swings
    poisson_weight  = round(max(0.30, min(0.70, raw_poisson_w)), 4)
    strength_weight = round(1.0 - poisson_weight, 4)

    # -------------------------------------------------------------------------
    # Derive Form vs H2H split within the Strength component
    # Keep home_adv at a fixed 15% — it's not a learnable feature here
    # -------------------------------------------------------------------------
    strength_signal_total = form_signal + h2h_signal
    if strength_signal_total > 0:
        raw_form_w = form_signal / strength_signal_total
        raw_h2h_w  = h2h_signal  / strength_signal_total
    else:
        raw_form_w = 0.55 / 0.85
        raw_h2h_w  = 0.30 / 0.85

    # Scale so form + h2h = 85% (remaining 15% reserved for home_adv)
    form_weight     = round(max(0.30, min(0.65, raw_form_w * 0.85)), 4)
    h2h_weight      = round(max(0.10, min(0.45, raw_h2h_w  * 0.85)), 4)
    home_adv_weight = round(max(0.05, 0.85 - form_weight - h2h_weight), 4)

    # Delete old weights and write new ones
    db.query(ModelWeights).delete()
    db.add(ModelWeights(
        poisson_weight=poisson_weight,
        strength_weight=strength_weight,
        form_weight=form_weight,
        h2h_weight=h2h_weight,
        home_adv_weight=home_adv_weight,
        sample_size=n,
        cv_accuracy=round(cv_accuracy, 4),
    ))
    db.commit()

    result = {
        "skipped":         False,
        "sample_size":     n,
        "cv_accuracy":     round(cv_accuracy * 100, 1),
        "weights": {
            "poisson":   poisson_weight,
            "strength":  strength_weight,
            "form":      form_weight,
            "h2h":       h2h_weight,
            "home_adv":  home_adv_weight,
        },
    }
    logger.info(f"LR training complete: {result}")
    return result


def load_model_weights(db: Session) -> dict | None:
    """
    Load the latest fitted model weights from the DB.
    Returns None if no training has run yet (engine uses hardcoded defaults).
    """
    row = db.query(ModelWeights).order_by(ModelWeights.updated_at.desc()).first()
    if not row:
        return None
    return {
        "poisson_weight":  row.poisson_weight,
        "strength_weight": row.strength_weight,
        "form_weight":     row.form_weight,
        "h2h_weight":      row.h2h_weight,
        "home_adv_weight": row.home_adv_weight,
    }
