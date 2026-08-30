LYNESQUE FRIEND CLIENT
======================

This package contains only the Lynesque desktop client. It cannot host a
Lynesque server and contains no server, shit-tok, or stored user/media data.

HOW TO START
------------

1. Extract the entire lynesque-client folder.
2. Double-click run-friend.bat.
3. The first run may install Node.js, Git, and the client dependencies. Git is
   used only to download future Lynesque client updates automatically.
4. Create an account or sign in. The client automatically tries
   https://lyneque.com and https://lynesque.com; there is no server address.

The host computer must be awake with run-host.bat still running. Friends do not
need Tailscale or another VPN. These domain addresses stay the same between
host restarts once their Cloudflare routes are active.

Do not open or forward port 8787 on the host's internet router.

AUTOMATIC UPDATES
-----------------

run-friend.bat checks https://github.com/Lynesque/lynesque-client for updates
every time it starts. This works even if the first copy was downloaded as a ZIP:
the launcher connects the extracted folder to the repository on its first run.

CURRENT UPDATE
--------------

- Master volume slider with protection against only extremely loud peaks.
- Profile pictures beside video creators and comments.
- Following/follower counts and follow buttons on videos and profiles.
- Mutually exclusive upvotes/downvotes displayed as one net-like score.
- Automatic lyneque.com/lynesque.com connection with no server field.
- Notification and comments drawers, including comment reactions/timestamps.
- Image/GIF comment stickers and a saved-asset creator library.
- Optional email MFA and one-account-per-email verification.
- Mature tags, adult-only visibility settings, and admin Mature-tag notices.
- Private creator assets that stay out of the shared library and stickers.
- Per-layer volume/source trimming and persistent transform-sync toggles.
- Public Rules, Terms, Privacy, minimum-age, and abuse/takedown pages.
- Safer blurred moderation previews and separate resolved-report history.
