# ProBe Redaktion v1 – Test

PROBE REDAKTION v1 – TESTSTAND
---

Redaktion: https://redesign-light--probe-lsa.netlify.app/admin/
Testwebsite: https://redesign-light--probe-lsa.netlify.app/
Produktivwebsite: https://probe-sachsen-anhalt.de/ (BLEIBT UNVERÄNDERT)

TECHNIK
-------
- Eigenständiges ProBe-CMS, kein GitHub-/Decap-Login für die Redaktion.
- Login per passwortgeschützter, signierter HttpOnly-Cookie-Session.
- Passwort-Hash und Session-Schlüssel ausschließlich als Netlify-Umgebungsvariablen
  (Functions, branch-deploy, als secret markiert). KEINE Passwörter im Repository.
- Netlify Functions + Netlify Blobs mit separatem Test-Speicher 'probe-editor-stage'.
- Live-Schreibzugriff durch PROBE_CMS_LIVE_ENABLED geschützt und standardmäßig AUS.
- Dateien: JPG/PNG/WEBP/GIF/PDF, bis 5 MB; Fotos werden im Browser als WebP optimiert.
- Alte Inhalts-JSONs bleiben unverändert als Ausfallsicherung erhalten.

FUNKTIONEN FÜR KATRIN
--------------------
1. Aktuelles: Neue Beiträge, Überschrift, Datum/Kategorie, Text, Foto, Sichtbarkeit;
   Startseite zeigt bis zu 3 sichtbare Meldungen, Rest unter /aktuelles.html.
2. Team: Personen, Region, Funktion, Foto, E-Mail und Telefon bearbeiten.
3. Flyer & Material: zentrale Kontaktdaten, Hauptflyer und zusätzliche Downloads.
4. Website bearbeiten: bestehende Texte je Seite und Sprache, Bilder, Impressum/Datenschutz
   mit Warnhinweis für notwendige rechtliche Freigabe.
5. Mediathek: Dateien hochladen und vorhandene Dateien sehen.
6. Versionen: Vorherige Veröffentlichung als ENTWURF wiederherstellen; keine direkte
   automatische Live-Änderung.

ABLAUF
------
- Anmelden und Bereich wählen.
- Inhalte bearbeiten, bei Bedarf Sprachversion auswählen (de/en/ar/ru/tr/uk/vi).
- Entwurf speichern; Entwurf im integrierten Vorschau-Fenster ansehen.
- Bewusst auf 'In Vorschau veröffentlichen' klicken. Das betrifft NUR die Redesign-Testseite.
- Die Schaltfläche 'Veröffentlichte Testseite' öffnet den zuletzt publizierten Teststand;
  ungespeicherte Änderungen erscheinen ausschließlich in der integrierten Entwurfsvorschau.

WICHTIG FÜR DEN SPÄTEREN LIVEGANG
--------------------------------
- Kein Merge nach main ohne ausdrückliche Freigabe.
- Für Produktion sind separate Zugangsdaten, Datenschutz-/CMS-Abnahme und eine
  bewusst geplante Übernahme der redaktionellen Inhalte und Medien nötig.
- Live-Schreibzugriff erst nach separater expliziter Freigabe und Einrichtung aktivieren.
- Netlify-Blobs-Speicher für Test und Produktion sind absichtlich getrennt.

QA
--
- Statischer Test: aktuelle News, 4 Teamkontakte inkl. Maren, Flyer und 7 Sprachen erhalten.
- JavaScript-Syntaxprüfung bestanden; Redesign-Branch-Deploy wird auf Netlify gebaut.
- Vollständige Ende-zu-Ende-Prüfung von Login, Speichern, Upload, Veröffentlichung und
  Browserlayout steht vor einer Freigabe für die Redaktion noch aus.
