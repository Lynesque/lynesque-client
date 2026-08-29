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
4. On the Lynesque sign-in screen, replace the Server address with the address
   supplied by the host. It will usually look like one of these:

   Same Wi-Fi:  http://192.168.1.25:8787
   Outside Wi-Fi: https://random-words.trycloudflare.com

5. Create an account or sign in.

The host computer must be awake with run-host.bat still running. Friends do not
need Tailscale or another VPN. The outside-Wi-Fi address changes whenever the
host fully closes and reopens run-host.bat, so use the newest address the host
sends. The client remembers the last server address entered.

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
