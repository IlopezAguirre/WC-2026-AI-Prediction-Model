"""WC 2026 group-stage draw — single source of truth.

12 groups × 4 teams = 48 teams total.
Team names match the strings used in the trained model's Elo dictionary.
"""

WC2026_GROUPS: dict[str, list[str]] = {
    "A": ["Mexico", "USA", "Canada", "New Zealand"],
    "B": ["Argentina", "Chile", "Peru", "Australia"],
    "C": ["Brazil", "Colombia", "Venezuela", "Ecuador"],
    "D": ["France", "Belgium", "Switzerland", "Morocco"],
    "E": ["Spain", "Portugal", "Turkey", "Georgia"],
    "F": ["England", "Netherlands", "Hungary", "Senegal"],
    "G": ["Germany", "Denmark", "Serbia", "Costa Rica"],
    "H": ["Croatia", "Czech Republic", "Greece", "Egypt"],
    "I": ["Italy", "Ukraine", "Slovakia", "Cameroon"],
    "J": ["Japan", "South Korea", "Indonesia", "Saudi Arabia"],
    "K": ["Iran", "Uzbekistan", "Oman", "Bolivia"],
    "L": ["Uruguay", "Paraguay", "Nigeria", "South Africa"],
}

ALL_WC2026_TEAMS: list[str] = [
    team for teams in WC2026_GROUPS.values() for team in teams
]
