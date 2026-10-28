# Backlog

Ajoutez ici les idées et fonctionnalités à prendre en compte pour les prochaines
évolutions du projet. Avant de commencer une nouvelle feature, consulter ce
backlog pour repérer les dépendances, les interactions et les décisions à
préserver, puis le mettre à jour si la portée ou le statut des éléments change.

## Priorités proposées

Les priorités ci-dessous privilégient d'abord les améliorations compatibles
avec la progression actuelle, puis les fonctionnalités qui élargissent les
mécaniques ou demandent des choix de conception.

1. **Mur stoppeurs** — Entrer en contact avec un mur stoppe le déplacement du
   joueur, avec un léger repoussement pour ne pas rester collé à la paroi.
   Point d’attention : le glissement le long des murs et le contournement des
   coins sont désormais fluides, et le joueur s’arrête déjà net quand la
   destination est droit derrière un mur (`blocked` dans
   `moveCircleWithObstacles`). Un arrêt au moindre contact risque de frustrer
   en glisser continu : à tester derrière une option ou sur certains murs.

2. **Équilibrage du prestige** — Mesurer en jeu la durée d’une première partie
   (cible : 8 à 12 minutes jusqu’à 3 couronnes) et ajuster
   `CROWN_RESOURCE_STEP`, `PRESTIGE_MIN_CROWNS` et les coûts des talents.

3. **Gains hors ligne** — Créditer une fraction des pépites qu’auraient
   récoltées les jetons aspirants pendant l’absence. Dépend de la sauvegarde
   locale (horodatage à ajouter au format de sauvegarde, version 2).

4. **Retour sonore** — Sons courts pour la collecte, la pépite double,
   l’invocation (variant selon la rareté) et le prestige, avec un bouton muet.

5. **Nouveaux compagnons de fin de cycle** — Un groupe « Légendaire »
   uniquement invocable après un premier prestige, pour renouveler les parties
   suivantes.

6. **Succès supplémentaires** — Succès cachés (révélés une fois obtenus) et
   meilleur temps conservé après « Recommencer de zéro », pour comparer les
   tentatives de speedrun. Tout nouveau succès allonge le 100 % : les temps
   déjà réalisés ne sont alors plus comparables.

## Fait

- Prestige global avec couronnes et 6 talents permanents (remplace l’idée de
  prestige par compagnon : le talent « Au-delà du plafond » permet de dépasser
  le niveau 3).
- Popup d’invocation mettant en avant rareté, nom et niveau.
- Sauvegarde locale automatique (`localStorage`, clé `kattak:save`).
- Correction du tremblement contre les coins de mur (déplacement par sous-pas
  et repoussement selon la normale de contact).
- Interface sans défilement de page : arène dimensionnée sur la hauteur de
  l’écran, invocation toujours visible, menus en onglets (Compagnons, Atelier,
  Prestige, Journal) avec pastilles quand une action y est possible. Sur
  téléphone, barre d’onglets en bas et seul le contenu de l’onglet défile.
  Tout nouveau menu doit trouver sa place dans un onglet existant ou nouveau.
- Succès (28, onglet « Succès ») et chrono de temps de jeu, arrêté au 100 %
  pour le speedrun. Le chrono est masqué par défaut et s’affiche via la case
  « Mode speedrun » de l’onglet Succès ; il mesure le temps même masqué. Statistiques cumulées (`stats`) dans la
  progression, conservées au prestige. Le chrono démarre à la première
  commande et se met en pause quand la page est masquée. Les gains hors ligne
  (priorité 3) devront s’articuler avec ce chrono (ne pas le faire avancer).

## Format suggéré

- **Idée** — description courte, objectif ou bénéfice attendu, contraintes ou
  dépendances connues.
