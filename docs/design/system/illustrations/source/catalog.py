"""Names, groups and uses for the illustration set (shared by the gallery and README)."""

GROUPS = [
    ('Rewards and progress', [
        ('trophy', 'Lesson done, path finished'),
        ('xp-star', 'XP earned, level moments'),
        ('medal', 'Skill Shown or Kept, badges'),
        ('flame', 'Streak'),
        ('streak-freeze', 'Streak freeze earned or used'),
        ('target', 'Daily goal'),
        ('calendar', 'Week view, reminders time'),
        ('certificate', 'Path certificate'),
        ('gift', 'Offers, free unit, referral'),
    ]),
    ('Learning', [
        ('gate', 'Welcome, sign up, onboarding'),
        ('rocket', 'Start a path, first lesson'),
        ('lesson-card', 'Lesson intro, lesson list'),
        ('skill-check', 'Skill check intro and summary'),
        ('review', 'Review queue, review session'),
        ('feedback', 'Feedback, appeals'),
        ('bulb', 'Hint, concept card, tips'),
        ('video', 'Video step, hybrid paths'),
        ('path-map', 'Path map intro, progress'),
    ]),
    ('Paths and content', [
        ('path-forms', 'P01 Forms That Flow'),
        ('path-hierarchy', 'P10 Visual Hierarchy in Action'),
        ('path-usability', 'P02 Find and Fix Usability'),
        ('article', 'Articles, reading, what is new'),
    ]),
    ('System states', [
        ('empty-box', 'Empty lists'),
        ('search', 'No search results'),
        ('offline', 'Offline, answers kept on the device'),
        ('error', 'Something went wrong, 404'),
        ('lock', 'Locked unit'),
        ('key', 'Unlock, paywall'),
        ('shield', 'Saved, privacy, security'),
        ('payment', 'Payment done, billing'),
        ('mail', 'Check your email, sign-in link'),
        ('bell', 'Notifications, reminders'),
        ('support', 'Help and support'),
    ]),
]

ANIMATED = [
    ('lesson-done', 'Plays once, 1.8 s', 'Lesson end, path finished'),
    ('welcome', 'Plays once, 1.9 s', 'First open, after sign up'),
    ('xp', 'Loops, 2.6 s', 'XP earned on lesson end'),
    ('streak', 'Loops, 1.3 s', 'Streak kept today'),
    ('reminder', 'Loops, 2.8 s', 'Reminder prompt, notifications empty state'),
    ('hint', 'Loops, 1.8 s', 'Hint sheet, concept card'),
    ('saving', 'Loops while saving', 'Saving answers, syncing'),
    ('searching', 'Loops while loading', 'Search, loading a path'),
    ('offline', 'Loops, 3 s', 'Offline banner page'),
]
