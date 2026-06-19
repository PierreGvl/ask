# Partitionnement de `chunks` par `projectId` (scaling — différé)

Aujourd'hui `chunks` est une table unique avec un index HNSW global. La
recherche filtre par `project_id` (sur-échantillonnage + post-filtre), ce qui
est suffisant tant que les corpus restent modestes (quelques milliers de chunks
par tenant).

**Quand y passer** : si un index HNSW global devient le goulot (latence de
recherche qui monte avec le nombre total de chunks tous tenants confondus), on
partitionne par `project_id` pour obtenir un index HNSW **par tenant**.

## Chemin de migration (esquisse)

1. Renommer `chunks` → `chunks_legacy`.
2. Recréer `chunks` en table partitionnée :
   ```sql
   CREATE TABLE chunks (... , PRIMARY KEY (id, project_id))
     PARTITION BY LIST (project_id);
   ```
3. Créer une partition par projet existant, puis un index HNSW + GIN FTS **sur
   chaque partition**.
4. Copier les données depuis `chunks_legacy`, supprimer l'ancienne table.
5. À la création d'un projet : créer automatiquement sa partition (hook dans
   `createProject`).

Le `project_id` étant présent sur `chunks` depuis le début, cette bascule
n'impacte pas le code applicatif (les requêtes filtrent déjà par `project_id`).
Le coût est purement opérationnel (fenêtre de maintenance pour la recopie).
