# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Dunkle, warme Red-Carpet-Ästhetik: tiefes Anthrazit-Schwarz als Bühne, Champagnergold als Akzent und elegante Serifen-Typografie – glamourös wie eine Hollywood-Premiere, aber ruhig und klar bedienbar.

## Colors

- `--color-bg`: **#171310**
- `--color-surface`: **#221B16**
- `--color-surface_alt`: **#2C241C**
- `--color-fg`: **#F6EFE3**
- `--color-accent`: **#D4AF37**
- `--color-accent_hover`: **#E0BE57**
- `--color-accent_active`: **#C9A227**
- `--color-border`: **#3B2F24**
- `--color-muted`: **#A89888**
- `--color-danger`: **#B0413E**
- `--color-danger_hover`: **#C2574F**
- `--color-success`: **#6E8B63**
- `--color-focus`: **#E8CE82**
- `--color-overlay`: **rgba(10, 8, 6, 0.72)**

## Typography

- `font_family`: Georgia, 'Times New Roman', serif
- `heading_weight`: 600
- `body_weight`: 400

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

Primär: bg #D4AF37, Text #171310, padding 12px 24px, radius md 8px, min-height 48px, font-weight 600, letter-spacing 0.02em; hover bg #E0BE57; active bg #C9A227 und translateY(1px); disabled bg #3B2F24, Text #A89888, opacity 0.6; focus Ring 2px #E8CE82, offset 2px. Sekundär: transparent, border 1px #3B2F24, Text #F6EFE3; hover border #D4AF37, Text #D4AF37. Destruktiv: bg #B0413E, Text #F6EFE3; hover bg #C2574F. Alle Varianten min-height 44px (Mobile-Tap), ideal 48px.

### Card

bg #221B16, border 1px #3B2F24, radius lg 16px, padding 24px, Schatten 0 8px 24px rgba(0,0,0,0.35); interaktive Karte hover: border #D4AF37, transform translateY(-2px), transition 160ms ease.

### Input

bg #171310, border 1px #3B2F24, radius md 8px, padding 12px 16px, min-height 48px, Text #F6EFE3, placeholder #A89888; focus border #D4AF37, Ring 2px rgba(212,175,55,0.35); Fehlerzustand border #B0413E, Hinweistext #B0413E.

### Nav/Topbar

Höhe 64px, bg rgba(23,19,16,0.92) mit backdrop-filter blur(12px), untere Trennlinie 1px #3B2F24; Logo in Kapitälchen, letter-spacing 0.18em, Farbe #D4AF37; Navigation rechts, aktiver Link mit 2px Unterstreichung #D4AF37, inaktive Links #A89888, hover #F6EFE3; Touchziele min 44px.

### CategoryChip

bg #2C241C, Text #F6EFE3, border 1px #3B2F24, radius pill, padding 6px 14px, min-height 32px; hover border #D4AF37; aktiv bg #D4AF37, Text #171310, border transparent, font-weight 600.

### ImageTile

Kleidungsstück-Kachel: Bildbereich aspect-ratio 3/4, radius md 8px, bg #2C241C, Bild object-fit cover; unterer Verlauf rgba(23,19,16,0) nach rgba(23,19,16,0.85) für Lesbarkeit; Name #F6EFE3, Kategorie als CategoryChip; hover Rahmen 1px #D4AF37, Bild scale 1.03, transition 160ms ease.

### Modal

bg #221B16, border 1px #3B2F24, radius lg 16px, padding 32px, max-width 560px, zentriert; Overlay rgba(10,8,6,0.72) mit backdrop-filter blur(4px); Schließen-IconButton 44x44px oben rechts; mobile Breite calc(100% - 32px).

### FileDropzone

Upload-Bereich: border 1.5px dashed #A89888, radius lg 16px, padding 32px, bg transparent, Text #A89888; hover/drag-over bg rgba(212,175,55,0.06), border #D4AF37, Text #F6EFE3; zentriertes Upload-Icon 32px, darunter 'Bild auswählen oder hierher ziehen'.

### EmptyState

zentriert, Icon in Kreis 64px mit border 1px #3B2F24 und Farbe #A89888, Text #A89888, Abstand 24px, primärer CTA-Button darunter.

### Toast

bg #2C241C, border-left 3px #D4AF37, radius md 8px, padding 12px 16px, Schatten 0 8px 24px rgba(0,0,0,0.35), Text #F6EFE3; Fehler border-left #B0413E; Erfolg border-left #6E8B63.

### IconButton

44x44px, radius md 8px, bg transparent, Farbe #F6EFE3; hover bg #2C241C; active bg #221B16; danger hover bg rgba(176,65,62,0.12), Farbe #B0413E; disabled opacity 0.4.

### OutfitCard

Card mit Outfit-Vorschau: Bildraster aus max. 4 Miniatur-Kacheln (je 64x64px, radius sm 4px, object-fit cover), Outfit-Name #F6EFE3, Löschen als IconButton; hover Rahmen #D4AF37.

## Layout Principles

- Maximale Inhaltsbreite 1200px, zentriert; Seitenabstand 16px mobil, 24px Tablet, 32px Desktop.
- Breakpoints: 640px, 768px, 1024px; Garderoben-Grid: 2 Spalten mobil, 3 ab 768px, 4 ab 1024px, Gap 16px.
- Vertikaler Abstand zwischen Sektionen 48px, innerhalb von Karten 24px.
- Header fixiert oben, Inhalt mit padding-top 88px (64px Header + 24px Abstand).
- Outfit-Creator: ab 1024px zweispaltig (Auswahl links 2/3, Vorschau rechts 1/3), darunter gestapelt.
- Alle interaktiven Elemente mindestens 44px hoch/breit; Abstand zwischen Touchzielen mindestens 8px.
- Texthierarchie: Seitenüberschriften 32px/600, Kartenüberschriften 20px/600, Fließtext 16px/400, Metatext 14px in #A89888.
