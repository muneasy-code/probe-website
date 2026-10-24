# ProBe Studio – Redesign-Redaktion

Dieses Studio ist eine **eigene** Redaktionsoberfläche (kein GitHub-Login, kein Decap CMS).

## Stand
- [x] Eigener Login über Supabase Auth + Freigabeliste `probe_cms_editors`
- [x] Aktuelles/NEWS: Titel, Datum, Text, optionales Foto, sieben Sprachfassungen, Sichtbarkeit
- [x] Teamprofile: Name, Foto, Funktion, Region, E-Mail, Telefon, sieben Sprachen
- [x] Downloads/PDF-Dateien und zentraler Kontakt
- [x] Redaktionsansichten für Texte, Bilder und Links der vorhandenen Seiten
- [x] Foto- und PDF-Uploads in `probe-cms-media`
- [x] Entwurf speichern / Veröffentlichen – getrennte Datentabellen
- [x] Maximal drei Meldungen auf der Startseite, übrige im Archiv `/aktuelles.html`
- [x] Öffentliche Website liest nur veröffentlichte JSON-Inhalte und fällt bei fehlender Verbindung auf bestehende Website-Dateien zurück
- [ ] Redakteurskonto für Katrin freischalten (erfordert die korrekte E-Mail/Benutzer-ID)
- [ ] Preview-End-to-End-Test mit berechtigtem Testaccount durchführen
- [ ] Freigabe durch Auftraggeberin vor Integration in den `redesign`-Zweig

## Sicherungsprinzip
Nur der Feature-Zweig `feature/probe-studio` enthält die CMS-Änderungen, abgezweigt von `redesign`.
`main` und die Netlify-Produktivveröffentlichung werden dabei **nicht** berührt.

Die App nutzt den bereits vorhandenen Supabase-Projektraum der ProBe Kommandozentrale, **ausschließlich** die neu angelegten Tabellen `probe_cms_editors`, `probe_cms_drafts` und `probe_cms_published` sowie den Bucket `probe-cms-media`. Tabellen der Kommandozentrale bleiben unverändert.

## Redaktionskonto einmalig freischalten
1. In der Supabase-Auth-Benutzerverwaltung des bestehenden Projekts den Redaktionsaccount anlegen oder einladen (keine öffentliche Selbstregistrierung über das Studio).
2. Sobald der Auth-Account existiert, die Berechtigung über eine geeignete Admin-Oberfläche oder eine einmalige Admin-SQL-Anweisung vergeben, z. B.:

```sql
insert into public.probe_cms_editors (user_id, active)
select id, true from auth.users where email = 'FREIGEGEBENE_KATRIN_EMAIL'
on conflict (user_id) do update set active = true;
```

Erst dann ist der Login in `/studio/` möglich. Nicht-freigeschaltete Accounts dürfen wegen der Row Level Security weder Entwürfe lesen noch schreiben oder veröffentlichen.

## Veröffentlichung
- Redaktionsaktion `Entwurf speichern`: persistiert ausschließlich in `probe_cms_drafts` – nicht öffentlich.
- Redaktionsaktion `Veröffentlichen`: persistiert die gesamte jeweilige Inhaltssammlung in `probe_cms_published`. Sie wird nur von dem Website-Code der neuen Branch-Version gelesen.
- Das ersetzt **keine** Veröffentlichung der neuen Website nach offizieller Freigabe.
- Die bisherige Live-Website auf `main` hat keine Schnittstelle zu diesen Tabellen.

## Hinweise
- Im Ordner `/admin/` befindet sich noch das **bestehende** Decap CMS. Es wird hier bewusst nicht gelöscht, bevor die neue Lösung durchgetestet und akzeptiert ist.
- Der publishable Schlüssel im Browser ist für den öffentlichen Data-API-Client bestimmt. Keinesfalls einen Supabase Service-Role-Key in Frontendcode einfügen.
- Ein Datensatz in `probe_cms_published` ist für alle Websitebesucher lesbar. Dort ausschließlich tatsächlich öffentliche Inhalte ablegen.
- Bereits hochgeladene Medien sind über öffentliche URLs erreichbar, selbst wenn ein Artikel noch Entwurf ist. Bei vertraulichen Fotos einen privaten Medienworkflow ergänzen.
- Bevor das Studio produktiv genutzt wird: Datenschutz/Fotorechte, Supabase-Backups, Browser- und Mehrsprachigkeitstests abnehmen.
