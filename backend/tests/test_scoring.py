from app.schemas.strategist import calculate_opportunity_score, OpportunityCandidate, StrategistOutput


def test_scoring_formula():
    # score = 0.30 * impact + 0.30 * evidence_strength + 0.25 * confidence + 0.15 * (6 - effort)
    # Case 1: Max scores (5, 5, 5, effort=1)
    # 0.30*5 + 0.30*5 + 0.25*5 + 0.15*5 = 1.5 + 1.5 + 1.25 + 0.75 = 5.0
    score_max = calculate_opportunity_score(impact=5, evidence_strength=5, confidence=5, effort=1)
    assert score_max == 5.0

    # Case 2: Min scores (1, 1, 1, effort=5)
    # 0.30*1 + 0.30*1 + 0.25*1 + 0.15*1 = 0.30 + 0.30 + 0.25 + 0.15 = 1.0
    score_min = calculate_opportunity_score(impact=1, evidence_strength=1, confidence=1, effort=5)
    assert score_min == 1.0

    # Case 3: Balanced values (4, 3, 4, effort=2)
    # 0.30*4 + 0.30*3 + 0.25*4 + 0.15*4 = 1.2 + 0.9 + 1.0 + 0.6 = 3.7
    score_mid = calculate_opportunity_score(impact=4, evidence_strength=3, confidence=4, effort=2)
    assert score_mid == 3.7


def test_opportunity_candidate_model():
    cand = OpportunityCandidate(
        id="opp-1",
        title="Test Opportunity",
        description="A great opportunity",
        user_problem="Solves manual testing delay",
        evidence_references=["https://competitor.com#feature"],
        facts_vs_hypotheses="FACT: Documented. HYPOTHESIS: Needed immediately.",
        impact=4,
        evidence_strength=4,
        confidence=4,
        effort=2,
        score=3.8,
        scoring_explanation="Formula computed",
    )
    assert cand.impact == 4
    assert cand.score == 3.8
