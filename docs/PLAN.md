# DTV App — Product Plan

_Stand: 2026-06-29, zuletzt aktualisiert: DTV-Kategorien + Planning Agent_

---

## Vision

DTV Workspace ist die All-in-One Plattform für Thailand Digital Nomad Visa (DTV) Antragsteller und Visa-Inhaber:
- **Before entry:** Personalisierte Checkliste + Dokument-Management + Marketplace für DTV-konforme Anbieter → Package Builder → Nachweis-Dokument
- **After entry:** Compliance-Tracker (TM30, 90-Day, Stamp-Expiry, Visa Run) + laufender Marketplace für Aktivitäten

---

## Monetarisierung

### Modell: Hybrid Freemium + Provider Listing

| Layer | Zielgruppe | Preis | Features |
|---|---|---|---|
| **Free** | User | €0 | Checklist, Guides, Demo-Marketplace (Cards only) |
| **Pro** | User | €9–15/Mo oder ~€69/Jahr | Reminders, Package Builder, Dokument-Generierung, volle Provider-Details |
| **Listed** | Provider | kostenlos | Basic Eintrag, sichtbar im Marketplace |
| **Featured** | Provider | €49–99/Mo | Oben gelistet, Badge, Dokument-Delivery-Feature |
| **DTV-Partner** | Provider | €149/Mo | Voll integriert, kann Docs direkt an User senden, First-Application Compliance |

### Später (Phase 4+)
- **Provision 5–10%** wenn Zahlungsvolumen groß genug → Stripe-Integration
- **DTV Renewal Service** (falls Immigration das vereinfacht) — einmalige Bearbeitungsgebühr, Unique Selling Point

---

## DTV Visa Kategorien (offiziell, Stand 2026)

> Wichtig: Diese bestimmen was wir im Marketplace anbieten und was der Planning Agent empfehlen darf.

### Workcation
Remote-Arbeit für ausländische Unternehmen oder Freelancer mit Kunden außerhalb Thailands.
- **Remote Employee:** Arbeitsvertrag + Employer Letter (remote work bestätigt)
- **Freelancer:** Portfolio, aktive Kundenverträge, Rechnungen, ggf. Gewerbeanmeldung
- ⚠️ Keine Arbeit für thailändische Unternehmen / thai Kunden erlaubt
- ⚠️ Kein Thai Work Permit möglich

### Thai Soft Power
Kulturelle / gesundheitliche Aktivitäten bei anerkannten Anbietern. **Minimum 6 Monate Programm** (kürzere Kurse haben ~100% Ablehnungsrate).

| Kategorie | Typ | Notes |
|---|---|---|
| `muay_thai` | Sport/Kampfkunst | Offizielles Trainingsprogramm, kein Touristenkurs |
| `cooking` | Kulinarik | Professionelle Ausbildung / Zertifikat, kein Wochenkurs |
| `medical` | Medizin/Wellness | Lizenziertes Krankenhaus oder Klinik |
| `seminar` | Bildung/Kunst | Anerkannte Veranstaltung / Institut |

### ❌ NICHT DTV-qualifiziert (häufiger Irrtum)
- **Thai Sprache lernen** → Das ist der **ED-Visa** (Non-Immigrant Education), NICHT DTV
- Allgemeine Sprachschulen → abgelehnt
- Kurze Kurse unter 6 Monaten (Soft Power) → abgelehnt
- Music Festivals als Hauptaktivität → sehr selten akzeptiert

### Dependent
Ehepartner oder Kind (unter 20) des DTV-Inhabers.

---

## Code-Korrekturen (vor Phase 3A umsetzen)

```
apps/web/types/dtv.ts
  SoftPowerInterest: 'music_festival' entfernen, 'sport_training' entfernen
  (sport_training ist Subcategory von muay_thai, kein eigener DTV-Pfad)
  Korrekt: 'muay_thai' | 'cooking' | 'medical' | 'seminar'

infra/seeds/checklist_items.sql
  Kein Eintrag für Thai-Sprache / language — bereits korrekt

apps/web/app/(dashboard)/onboarding/page.tsx
  SOFT_POWER_OPTIONS: 'music_festival' und 'sport_training' entfernen
```

---

## Phasen

### Phase 1 — Document Upload (nächster Sprint)

**Backend:**
- `integrations/s3.rs` mit echtem `aws-sdk-s3` / MinIO implementieren
- Axum multipart upload in `routes/documents.rs`
- S3-Key in `documents`-Tabelle speichern
- Download-Endpoint: signierte S3-URL zurückgeben

**Frontend:**
- Upload-Dialog aktivieren (File + optional Checklist-Item verknüpfen)
- Dokument-Preview / Download-Link
- Ablaufdatum-Feld (für Passport, Versicherung etc.)

---

### Phase 2 — Compliance Reminders & Visa-Tracker

**Datenmodell (neue Tabellen):**

```sql
-- Einreise-Tracker
visa_entries (
  id, user_id,
  entry_date DATE,
  stamp_expiry DATE,        -- entry_date + 180 Tage
  next_90day_date DATE,     -- entry_date + 90 Tage
  exit_date DATE,           -- NULL bis Ausreise
  is_visa_run BOOLEAN,
  created_at
)

-- Reminder-Queue (Worker verarbeitet)
reminders (
  id, user_id, visa_entry_id,
  type TEXT,                -- tm30 | 90_day_notice | stamp_expiry_30 | stamp_expiry_14 | stamp_expiry_7 | renew_booking | visa_run
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT               -- pending | sent | dismissed
)
```

**Reminder-Logik pro Einreise:**

| Typ | Wann fällig | Reminder verschicken |
|---|---|---|
| TM30 | Einreise +1 Tag | Sofort |
| 90-Day Report | entry + 90 Tage | 14 Tage vorher |
| Neue Buchung? | entry + 150 Tage | „Hast du min. 6 Monate gebucht für nächsten Aufenthalt?" |
| Visa Run gebucht? | entry + 150 Tage | „Hast du deinen Visa Run geplant?" |
| Stamp Expiry | entry + 180 Tage | 30 + 14 + 7 Tage vorher |

**Visa Run Flow:**
- User loggt geplanten Exit
- Bei Re-Entry: neue `visa_entry` wird angelegt → alle Reminder neu berechnet
- Die 180-Tage-Uhr startet von neuem

**Worker (endlich befüllen):**
- Cron alle 6h: `SELECT * FROM reminders WHERE scheduled_at <= now() AND status = 'pending'`
- Reminder abarbeiten → E-Mail via `email.rs` (Resend / Postmark / SMTP)
- `sent_at` + `status = 'sent'` setzen

**Frontend:**
- Neuer Tab "Compliance" im Dashboard
- Visa-Einreise eintragen (Kalender-UI)
- Countdown-Cards: TM30, 90-Day, Stamp Expiry
- Visa Run loggen + Status (geplant / gebucht / done)
- TM30-Beleg hochladen (Dokumenten-System nutzen)
- In-App Notification Center (Bell-Icon im Header)

---

### Phase 3A — DTV Marketplace (User-Flow)

#### Provider-Erweiterung

Neue Felder für bestehende `providers`-Tabelle:
```sql
ALTER TABLE providers ADD COLUMN is_dtv_first_app_compliant BOOLEAN DEFAULT false;
ALTER TABLE providers ADD COLUMN company_id UUID;          -- NULL bis Phase 3B
ALTER TABLE providers ADD COLUMN available_durations INT[]; -- z.B. [30, 60, 90] Tage
ALTER TABLE providers ADD COLUMN base_price_per_month INT; -- in EUR-Cent
ALTER TABLE providers ADD COLUMN contact_email TEXT;
```

#### Unterschied First Application vs. Ongoing

| | First Application | Ongoing |
|---|---|---|
| DTV-konform | Ja (Pflicht) | Nicht nötig |
| Dokument-Delivery | Enrollment Letter an User | Keine Pflicht |
| Beispiele | Muay Thai Camp mit offiz. Programm, Kochschule mit Zertifikat | Beliebiges Gym, Cafe, Accommodation |

#### Neue DB-Tabellen

```sql
-- Reiseplan des Users
packages (
  id, user_id,
  name TEXT,
  status TEXT,              -- draft | confirmed | active | completed
  start_date DATE,
  end_date DATE,
  total_days INT,
  purpose TEXT,             -- first_application | ongoing
  created_at, updated_at
)

-- Einzelne Buchungen im Paket
bookings (
  id, package_id, user_id, provider_id,
  activity_type TEXT,       -- muay_thai | cooking | medical | etc.
  city TEXT,
  start_date DATE,
  end_date DATE,
  duration_days INT,
  purpose TEXT,             -- first_application | ongoing
  status TEXT,              -- pending | confirmed | cancelled
  provider_doc_id UUID,     -- Link zu Dokument das Provider schickt (Phase 3B)
  notes TEXT,
  created_at
)

-- Generiertes Gesamt-Paket-Dokument
package_documents (
  id, package_id,
  document_type TEXT,       -- itinerary_confirmation | dtv_proof_bundle
  s3_key TEXT,
  generated_at TIMESTAMPTZ,
  valid_for_path TEXT        -- workcation | soft_power | dependent
)
```

#### Package Builder UI

1. **Provider Browser:**
   - Filter: Kategorie, Stadt, DTV-konform ja/nein, Verfügbarkeit
   - Öffentlich: Cards sichtbar
   - Eingeloggt (Free): Detailansicht
   - Pro: "Zum Paket hinzufügen"

2. **Package Builder:**
   - Zeitleiste: Provider-Slots mit Datum-Picker
   - Validierung: keine Überschneidungen, Lücken-Warnung, Gesamt-Tage-Counter
   - Warnung wenn < 180 Tage und First Application
   - DTV-konform-Check: mind. 1 First-App-Provider wenn Zweck = first_application

3. **Dokument generieren:**
   - Button "Itinerary bestätigen" → PDF wird serverseitig generiert
   - Enthält: User-Name, alle Buchungen mit Datum/Ort/Aktivität, Gesamttage, Platform-Signatur
   - Wird als Dokument im User-Account gespeichert
   - Verknüpft mit Checklist-Item "Nachweis Aufenthaltsplanung"

**Beispiel-Dokument:**
```
DTV Activity Itinerary Confirmation
Erstellt von: DTV Workspace Platform
Datum: 01.06.2025

Antragsteller: Max Mustermann
Gesamtzeitraum: 01.07.2025 – 28.12.2025 (181 Tage)

01.07.–01.09.  Muay Thai Training   Tiger Muay Thai, Bangkok     (62 Tage)
01.09.–01.11.  Thai Cooking         Samui Culinary School        (61 Tage)
01.11.–28.12.  Muay Thai Training   Hua Hin Boxing Camp          (57 Tage)

Alle aufgeführten Anbieter sind bei DTV Workspace verifiziert.
Plattform-Referenz: #PKG-2025-00123
```

**Offen (rechtlich klären):**
- Reicht das Platform-Dokument allein, oder muss jeder Provider einzeln stempeln/unterschreiben?
- Option: Provider lädt Enrollment Letter hoch (Phase 3B) → Bundle-PDF enthält beides

#### Marketplace Visibility

```
Nicht eingeloggt:
  Provider-Cards (Name, Kategorie, Stadt, Bild)
  Detail-View → "Einloggen für Details"
  CTA: "Kostenlos registrieren"

Free User:
  Volle Detailansicht
  Package Builder: nur ansehen / draft
  Dokument-Generierung → Pro-Paywall

Pro User:
  Package Builder + Dokument-Download
  Alle Provider-Kontaktdaten
```

---

### Phase 3A-2 — Planning Agent (AI-gestützter Reiseplan)

#### Konzept
Chat-Interface das dem User hilft, einen gültigen DTV-Reiseplan zu erstellen. Hybrid aus strukturiertem Input + Claude-generierter Empfehlung.

#### Flow

```
1. User öffnet "Plan my trip" (Chat-Interface)

2. Agent stellt gezielte Fragen (strukturiert, nicht Free-Text):
   - Welcher DTV-Pfad? (Workcation / Soft Power)
   - Wenn Soft Power: Welche Aktivität? (Muay Thai / Cooking / Medical / Seminar)
   - Gesamtdauer (wie viele Monate?)
   - Budget (gesamt oder pro Monat, Währung)
   - Bevorzugte Orte? (Bangkok, Chiang Mai, Koh Samui, Hua Hin, Phuket — Mehrfachauswahl oder "egal")
   - Lifestyle-Präferenz? (Stadt / Strand / Natur / Mix — optional)
   - Erfahrungslevel bei Soft Power? (Anfänger / Fortgeschritten — optional)

3. Agent generiert Plan:
   - Greift auf verfügbare Provider aus DB zu (Context-Injection)
   - Berücksichtigt DTV-Regeln (mind. 6 Monate Soft Power, DTV-konforme Anbieter)
   - Gibt strukturierten Vorschlag + natürlichsprachige Begründung zurück
   - Warnt bei Problemen (Budget zu knapp für 6 Monate, keine Provider in Wunsch-Stadt, etc.)

4. User kann Plan anpassen:
   - Provider austauschen
   - Daten schieben
   - Weitere Fragen stellen ("Gibt es was Günstigeres in Hua Hin?")

5. "Plan übernehmen" → wird direkt zu Package im Package Builder
```

#### Beispiel-Conversation

```
Agent: Welchen DTV-Pfad planst du?
User:  Soft Power
Agent: Welche Aktivität interessiert dich?
User:  Muay Thai
Agent: Wie lange möchtest du insgesamt bleiben?
User:  6 Monate
Agent: Was ist dein Budget? (pro Monat in EUR)
User:  800€
Agent: Welche Städte kommen für dich in Frage?
User:  Bangkok und Hua Hin
Agent: Hast du schon Erfahrung mit Muay Thai?
User:  Anfänger

── Generating plan... ──

Hier ist mein Vorschlag für dein 6-Monate Muay Thai DTV-Programm:

📍 Monate 1–3: Bangkok
   Tiger Muay Thai Affiliate — Bangkoknoi
   ~650€/Monat inkl. Training (3x/Woche) — DTV-konform ✓
   Gut für Anfänger, großes Gym, Anfängerkurse täglich

📍 Monate 4–6: Hua Hin
   Hua Hin Muay Thai Camp
   ~550€/Monat inkl. Training — DTV-konform ✓
   Ruhigere Atmosphäre, intensiver, Strandnähe

Gesamtkosten (Training): ca. 3.600€ für 6 Monate
Verbleibend für Unterkunft + Leben: Rest deines Budgets

⚠️  Wichtig: Dein Programm muss min. 6 Monate umfassen — das ist erfüllt.
✅  Beide Anbieter sind DTV-konform und können Enrollment Letters ausstellen.

Soll ich diesen Plan in deinen Package Builder übernehmen?
```

#### Technische Umsetzung

**Backend — neuer Endpoint:**
```
POST /api/planner/chat
Body: { messages: [{role, content}], user_profile?: {...} }
Response: { message: string, suggested_package?: Package }
```

**Was der Agent als Context bekommt (System Prompt):**
- Alle verfügbaren Provider aus DB (gefiltert nach Kategorie + Verfügbarkeit)
- DTV-Regelwerk (Kategorien, Mindestdauer, Ablehnungsgründe)
- User-Profil (sofern vorhanden: Nationalität, Pfad, bisherige Checklist)
- Budget + Präferenzen aus dem Chat

**Modell:** Claude Haiku 4.5 (günstig, schnell, für strukturierte Empfehlungen ausreichend)
→ Fallback auf Sonnet wenn komplexe Abwägungen nötig

**Structured Output:** Agent gibt JSON-Block zurück den das Frontend parst:
```json
{
  "explanation": "...",
  "suggested_bookings": [
    { "provider_id": "...", "city": "Bangkok", "start_offset_days": 0, "duration_days": 90 },
    { "provider_id": "...", "city": "Hua Hin", "start_offset_days": 90, "duration_days": 90 }
  ],
  "warnings": ["Budget knapp für Unterkunft"],
  "dtv_compliant": true
}
```

**Frontend:**
- Chat-UI im `/planner`-Route (neue Seite)
- Message-Bubbles wie bekannte Chat-Apps
- Structured Cards für Provider-Vorschläge (kein Fließtext)
- Button: "Plan in Package Builder übernehmen"
- Paywall: Planner-Feature ist Pro (oder: 1 kostenloser Plan, dann Pro)

#### Was der Agent NICHT ist
- Kein Rechtsbeistand — immer Disclaimer: "Keine Rechtsberatung"
- Kein Buchungs-Tool — übernimmt Plan in Package Builder, User bucht dann selbst / kontaktiert Provider
- Kein Allgemein-Chatbot — bleibt fokussiert auf DTV-Planung

---

### Phase 3B — Company Dashboard (später)

**Scope:**
- Eigene Company-Accounts (Admin-approved, kein Self-Service)
- Companies verwalten ihre Provider-Listings (Preise, Verfügbarkeit, Bilder)
- **Dokument-Delivery:** Company lädt Enrollment Letter hoch → erscheint automatisch in User-Dashboard bei Buchung
- Buchungsmanagement: Eingehende Buchungen sehen, bestätigen, ablehnen
- Einnahmen-Übersicht (wenn Provision aktiv)

**Neue Tabellen:**
```sql
companies (
  id, name, email, password_hash,
  category TEXT,
  is_dtv_compliant BOOLEAN,
  verification_status TEXT,  -- pending | approved | suspended
  created_at
)

company_documents (
  id, company_id, booking_id, user_id,
  document_name TEXT,
  s3_key TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT                -- pending | delivered | acknowledged
)
```

---

## Reihenfolge (aktualisiert)

```
Phase 1    Document Upload                          — 1–2 Tage
Phase 1.5  Code-Korrekturen (SoftPowerInterest)     — 1h
Phase 2    Compliance Reminders + Worker             — 2–3 Tage
Phase 3A   Marketplace + Package Builder             — 4–6 Tage
Phase 3A-2 Planning Agent (Chat-UI + Claude API)     — 3–4 Tage
Phase 3B   Company Dashboard                         — später
```

---

## Offene Fragen

| # | Frage | Wer klärt | Status |
|---|---|---|---|
| 1 | Reicht Platform-Dokument als DTV-Nachweis oder braucht es Provider-Stempel? | Jan @ Immigration | offen |
| 2 | TM30 Upload: Was ist der genaue Beleg den Immigration ausstellt? | Jan | offen |
| 3 | DTV Renewal: Vereinfachtes Verfahren oder Neuantrag? Unique Service möglich? | Jan @ Immigration | offen |
| 4 | Pricing: Sind €9-15/Mo für Pro realistisch für die Zielgruppe? | Testen | offen |
| 5 | Stripe-Integration: ab welchem Volumen sinnvoll? | tbd | offen |

---

## Tech-Debt / Nicht vergessen

- Worker-App befüllen (Phase 2 benötigt ihn)
- Email.rs verdrahten (Resend empfohlen: einfachste Integration)
- Kein Self-Service für Company-Accounts → Admin-Panel erweitern
- PDF-Generierung: `printpdf` (Rust) oder extern (Puppeteer via Worker)
- Planning Agent: Claude API Key in `.env` eintragen (`ANTHROPIC_API_KEY`)
- Planning Agent: Provider-Daten werden per DB-Query in System-Prompt injiziert — kein RAG nötig solange Provider-Zahl < ~200
- Zahlungen: Stripe erst wenn Phase 3B live und Volumen vorhanden
