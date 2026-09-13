# DM-Creations Foto Logo

Een mobiele, volledig statische PWA waarmee je één of meerdere kaartfoto’s van het DM-Creations-logo voorziet. De fotoverwerking gebeurt lokaal in de browser. Foto’s worden niet geüpload en de originele bestanden worden niet gewijzigd.

## Techniek

- HTML, CSS en JavaScript, zonder framework of backend
- Canvas voor voorbeeld en export
- Web Share API voor het iOS-deelmenu
- `localStorage` voor watermarkinstellingen
- Service worker en webmanifest voor offline PWA-gebruik
- Relatieve bestandspaden, geschikt voor GitHub Pages-projectsites

## Lokaal gebruiken

Een service worker werkt alleen via HTTP(S), niet rechtstreeks via `file://`. Start in de projectmap bijvoorbeeld:

```bash
python3 -m http.server 8080 --directory dist
```

Open daarna `http://localhost:8080`. De app zelf heeft geen server of internetverbinding nodig nadat de bestanden zijn geladen.

## Publiceren via GitHub Pages

1. Maak op GitHub een repository met de naam `dm-creations-foto-logo`.
2. Upload de inhoud van deze projectmap naar de repository.
3. Open **Settings > Pages**.
4. Kies bij **Build and deployment** als bron **GitHub Actions**.
5. De meegeleverde workflow publiceert automatisch de map `dist`.
6. De app verschijnt op `https://<gebruikersnaam>.github.io/dm-creations-foto-logo/`.

Alle paden zijn relatief, dus publicatie vanuit deze submap werkt zonder codewijzigingen.

## Installeren op iPhone of iPad

1. Open de gepubliceerde app in Safari.
2. Tik op de deelknop.
3. Kies **Zet op beginscherm**.
4. Tik op **Voeg toe**.

Open de app na het eerste volledige bezoek nog eenmaal met internet. Daarna zijn de interface en het logo offline beschikbaar.

## Foto’s verwerken

Kies één of meerdere foto’s, pas zo nodig grootte, dekking, marge of positie aan en tik op **Alles verwerken**. Met **Delen** opent op ondersteunde iPhones en iPads het gewone iOS-deelmenu. Kan iOS meerdere bestanden niet samen delen, dan verschijnen deelknoppen per foto. Met **Opslaan** download je nieuwe bestanden; de oorspronkelijke foto’s blijven bestaan.

JPEG, PNG en WebP worden ondersteund. HEIC wordt verwerkt wanneer de gebruikte Safari-versie dit lokaal kan decoderen. Bij een niet-ondersteund HEIC-bestand toont de app een foutmelding en blijft de rest bruikbaar.

## Toekomstige updates

Werk steeds verder in dezelfde repository. Pas de bestanden in `dist` aan, verhoog bij wijzigingen de cacheversie bovenaan `dist/sw.js` en push naar `main`. GitHub Pages publiceert de nieuwe versie automatisch. Bestaande PWA-installaties nemen de update bij een volgend bezoek over.
