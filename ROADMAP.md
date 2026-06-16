# Roadmap — Ask By la Wine Tech

Backlog des améliorations possibles, regroupées par thème. Statuts :
✅ fait · 🔜 prêt à lancer · 💡 idée à creuser.

> Document de travail interne (le `RECAP.md` est, lui, orienté présentation).

---

## 1. Corpus & connaissances (cœur de valeur)

- ✅ Socle réglementaire UE (8 règlements, ~870 extraits) : OCM, AOP/IGP,
  étiquetage, pratiques œnologiques, info consommateurs/allergènes, casier
  viticole/déclarations, bio.
- 🔜 **Droit national via l'API Légifrance (PISTE)** — Code rural, etc., avec
  **mise à jour automatique** quand les textes évoluent. *(Approche retenue.)*
- 🔜 **Cahiers des charges INAO** (AOP/IGP par appellation) — la donnée la plus
  demandée par les vignerons. (PDF à fournir ou source à automatiser.)
- 💡 **Versions consolidées** d'EUR-Lex (texte à jour avec amendements) au lieu
  des versions de base actuelles.
- 💡 Fiscalité / douanes (accises, DRM, CRD), guides FranceAgriMer.
- 💡 Œnologie pratique (au-delà du réglementaire) : itinéraires techniques.

## 2. Mise à jour automatique

- 💡 **Ré-ingestion programmée** (cron) : re-télécharge les textes (consolidés)
  et ré-indexe les changements, sans intervention.
- 💡 **Auto-migrations au déploiement** : le conteneur applique les migrations
  au démarrage → plus besoin d'exposer la base manuellement à chaque évolution
  de schéma.

## 3. Qualité & pilotage des réponses

- ✅ Réponses **concises et équilibrées** (réglable via le prompt système).
- ✅ Citations cliquables + garde-fou anti-hallucination (« pas de source »).
- 🔜 **Feedback utilisateur 👍/👎** (+ commentaire) stocké en base → repérer les
  réponses faibles et les **trous du corpus** à combler en priorité.
- 💡 **Sélecteur « Concis / Détaillé »** dans l'interface (selon le public).
- 💡 **Tableau de bord** : questions fréquentes, taux de satisfaction, sujets
  demandés, requêtes sans source.

## 4. Application mobile (PWA)

- ✅ **Installable** sur écran d'accueil iPhone & Android (plein écran, icône,
  thème).
- 💡 **Fonctionnement hors-ligne** (service worker) — au moins l'interface.
- 💡 **Écrans de démarrage (splash)** iOS personnalisés par appareil.
- 💡 **Notifications push** (Android simple ; iOS 16.4+ possible mais avancé).
- 💡 **Packaging App Store / Play Store** via Capacitor (même code) si un jour
  une présence sur les stores est souhaitée.

## 5. Produit & fonctionnalités

- ✅ Chat streaming, comptes (prénom/nom), historique, mode invité.
- 💡 **Spécialisation par domaine** (réglementaire, œnologie, commercial, RH
  viticole…) — l'architecture le permet déjà (champ `domain`).
- 💡 Export / partage d'une conversation (PDF, lien).
- 💡 Recherche dans l'historique, dossiers/favoris.
- 💡 Vérification d'email à l'inscription (SMTP souverain).
- 💡 Rôles / espace pro (multi-utilisateurs d'une même structure).

## 6. Monétisation

- 💡 **Mécanique d'abonnement** : paiement Stripe, paliers (Gratuit / Pro /
  Structure), **quotas de questions**, espace facturation.
- 💡 Tableau de bord d'usage par compte (pour la facturation et le support).
- 👉 Stratégie tarifaire détaillée dans [`MODELE-ECONOMIQUE.md`](MODELE-ECONOMIQUE.md).

## 7. Technique & exploitation

- ✅ Déploiement automatique (push → build → prod), HTTPS, swap serveur.
- 💡 **Sauvegardes** automatiques planifiées de la base.
- 💡 Limitation de débit (rate-limit) renforcée pour le mode invité.
- 💡 Observabilité : logs structurés, alertes, suivi des coûts Mistral.
- 💡 Tests automatisés (régression sur le RAG : jeu de questions/réponses
  attendues).

---

*Mis à jour au fil des sessions. Priorité métier : enrichir le corpus
(Légifrance/INAO) et la boucle de feedback.*
