# QR Studio — QR Code Generator & Designer

A responsive, browser-based QR code generator built with HTML, CSS, and JavaScript. It uses the QRCode.js library from a CDN; no backend or account is required.

## Features

- Live QR preview for website URLs and plain text
- Email QR codes with optional subject and message
- Phone number QR codes
- Wi-Fi QR codes (WPA/WPA2, WEP, or open network)
- Custom foreground/background colors, size, margin, and error-correction level
- Three editable presets: Classic, Ocean, and Berry
- PNG download matching the displayed QR canvas
- Input validation and scanning-contrast guidance
- Up to five recent QR codes saved in browser `localStorage`
- Responsive desktop and mobile layout

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Keep an internet connection available so the QR library and optional Google Fonts can load.

You can also use VS Code's **Live Server** extension: right-click `index.html` and choose **Open with Live Server**.

## Project files

- `index.html` — page structure and form controls
- `style.css` — layout, styling, and responsive behavior
- `app.js` — QR generation, validation, presets, PNG export, and recent-code storage

## How it works

The app converts the selected form values into a QR payload, then uses QRCode.js to create the QR matrix. A canvas adds the chosen quiet-zone margin and is used for both the preview and PNG download. Recent codes are stored locally in the browser; they are not uploaded to a server.

## API / backend

No backend API is used. QR generation happens in the browser. The QRCode.js library is loaded from a CDN.

## Privacy note

Recent QR codes are saved in the browser's local storage on the device. Avoid generating QR codes containing secrets or sensitive information on a shared device. Clearing browser site data will remove saved recent codes.

## Validation and scanning notes

- Website entries must be valid HTTP/HTTPS URLs.
- Email and phone values are checked before generation.
- Wi-Fi codes require a network name and, unless the network is open, a password.
- Use a dark foreground and light background for reliable scanning. Test a downloaded code with a phone camera before sharing it.

## Before submitting

1. Test all five QR types.
2. Change colors, size, margin, correction level, and presets.
3. Download and scan the PNG.
4. Refresh the page and check that recent codes remain.
5. Test at desktop and mobile widths.
6. Add screenshots of the running application to this repository, as required by the recruitment brief.
7. Publish this project in a **public GitHub repository**.

## Suggested GitHub description

**QR Studio** — a responsive, browser-based QR code generator with multiple QR types, live customization, PNG export, validation, and locally saved recent codes.
