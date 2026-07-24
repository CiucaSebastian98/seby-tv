# Seby TV pe Samsung TV (Tizen OS)

Aplicația se împachetează ca app Tizen web (`.wgt`) instalabil pe televizor.

## Ce e deja pregătit în cod

- **`npm run build:tizen`** — build cu `base: './'` (path-uri relative, obligatoriu
  pentru app-ul încărcat din fișiere locale) și `target: es2017` (TV-uri mai vechi).
- **`public/config.xml`** — manifestul Tizen (ajunge automat în `dist/`). `hwkey-event`
  e activat, deci tasta Back a telecomenzii ajunge la aplicație.
- **HashRouter automat** când app-ul rulează din fișier local (vezi `src/main.jsx`);
  pe web rămâne BrowserRouter (URL-uri curate).
- **Tasta Back (10009)** — un pas înapoi, iar pe ecranul principal iese din app
  (`src/hooks/useTvRemote.js`).

## Pași de împachetare

Necesită **Tizen Studio** (cu „TV Extensions") sau **Tizen CLI**, plus un
**Samsung Certificate** (creat din Certificate Manager, cu cont Samsung).

```bash
# 1. Build-ul aplicației pentru Tizen (produce dist/ cu path-uri relative + config.xml)
npm run build:tizen

# 2. Împachetează dist/ ca .wgt semnat
cd dist
tizen build-web
tizen package -t wgt -s <numele-profilului-de-certificat>
# → rezultă un fișier .wgt
```

Alternativ, în Tizen Studio: `File → Import → Tizen Project`, alege folderul `dist/`
ca proiect Web, apoi `Build Signed Package`.

## Instalare pe TV (Developer Mode)

1. Pe TV: aplicația **Apps** → tastează `12345` pe telecomandă → activează
   **Developer Mode** și pune IP-ul PC-ului.
2. Pe PC:
   ```bash
   sdb connect <ip-tv>
   tizen install -n SebyTV.wgt -t <device>
   ```
   (sau din Device Manager în Tizen Studio).
3. Aplicația apare pe ecranul de start al TV-ului.

## Distribuție publică (opțional)

Pentru instalare de către oricine din magazinul TV: trimite `.wgt` în
**Samsung Apps TV – Seller Office** (are proces de review).

## Note

- `required_version="6.0"` în `config.xml` = TV-uri din ~2021+. Coboară-l (ex. `5.5`)
  ca să acoperi TV-uri mai vechi (verifică și compatibilitatea Chromium).
- Streaming: HLS prin proxy merge pe Chromium-ul Tizen (hls.js/MSE). Proxy-ul trebuie
  să fie pe **https** (mixed content e blocat).
- Navigare cu telecomanda: ecranul de răsfoire e complet navigabil (grid: săgeți +
  Enter). Pe pagina de canal: săgeți = schimbă canalul, Enter = fullscreen, Back = înapoi.
  Butoanele secundare (VLC, tab-uri de zi, dots din carusel) nu sunt încă în focus-ul
  cu telecomanda — pot fi adăugate ulterior pentru navigare spațială completă.
