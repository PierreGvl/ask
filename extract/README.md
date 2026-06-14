# Extraction Dooble — https://www.lawinetech.com/

Extraction réalisée le **2026-06-14T15:39:40.131Z** par Dooble v0.1.0.

Ce dossier est **autonome** : tu peux le déplacer où tu veux et t'en servir sans Dooble installé.

## Contenu du dossier

- `meta.json` — URL source, timestamp, infos logo.
- `content.json` — contenu structuré du site : titres (h1/h2/h3), paragraphes, nav, CTAs, images, sections, logo.
- `design-tokens.json` — palette normalisée + typo + radii + shadows + spacings.
- `design-tokens.css` — variables CSS prêtes à coller dans un projet.
- `design.raw.json` — données brutes pondérées par fréquence (debug / analyse poussée).
- `screenshot.png` — capture pleine page du site source (Claude la lit en vision multimodale).
- `logo.png` — logo téléchargé depuis le site (source: header-img, confiance: high).

## Aperçu

- **Palette** : primary `#141934` · secondary `#fdeef4` · accent `#263064`
- **Titre source** : « La WineTech | The Global Wine Innovation Ecosystem »
- **Sections détectées** : 5
- **Liens nav** : 11
- **CTAs** : 6
- **Images** : 7

## Exemples de prompts à donner à Claude

> *« Lis `content.json` et écris-moi un pitch deck de 10 slides pour cette boîte. »*

> *« À partir de `design-tokens.json` et `screenshot.png`, propose-moi 3 directions visuelles alternatives en gardant l'identité de marque. »*

> *« Génère 30 questions/réponses typiques pour entraîner un chatbot RAG sur cette entreprise, en te basant sur `content.json`. »*

> *« Compare cette extraction avec celle de `<autre-dossier>` et fais une analyse positionnement / identité. »*

---

_Généré automatiquement par [Dooble](https://github.com/) lors de l'extraction. Ce README peut être supprimé sans conséquence._
