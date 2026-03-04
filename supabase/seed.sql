-- Default Waiver Template
INSERT INTO waiver_templates (name, content, version, is_active)
VALUES (
  'Standard Tour Waiver',
  'PARTICIPANT AGREEMENT, RELEASE AND ASSUMPTION OF RISK

I, the undersigned participant, acknowledge that I am voluntarily participating in adventure tour activities provided by the tour operator. I understand that these activities involve certain risks, including but not limited to: weather conditions, water activities, physical exertion, equipment use, and other hazards.

ASSUMPTION OF RISK: I understand and acknowledge that participation in these activities involves inherent risks that cannot be eliminated regardless of the care taken to avoid injuries. I knowingly and freely assume all such risks, both known and unknown.

RELEASE OF LIABILITY: In consideration for being permitted to participate, I hereby release, waive, discharge, and covenant not to sue the tour operator, its officers, employees, agents, and volunteers from any and all liability, claims, demands, or actions arising out of or related to any loss, damage, or injury, including death, that may be sustained by me.

MEDICAL CONDITIONS: I certify that I am physically fit and have no medical conditions that would prevent my full participation in these activities. I agree to notify the tour operator of any changes to my physical condition before participation.

PHOTO/VIDEO RELEASE: I grant permission for photos and videos taken during the tour to be used for promotional purposes.

I have read this agreement, fully understand its terms, and sign it freely and voluntarily without any inducement.

By signing below, I acknowledge that I have read, understood, and agree to all terms of this waiver.',
  1,
  true
)
ON CONFLICT DO NOTHING;
