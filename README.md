# KattaK

Petit jeu 2D jouable dans le navigateur, développé avec TypeScript, Phaser 3 et Vite.

## Gameplay

- **Déplacement :** cliquez ou touchez l’arène pour déplacer le joueur. Vous pouvez changer de destination à tout moment. Les clics hors de l’arène sont ignorés.
- **Obstacles :** quatre murs bloquent les trajectoires directes. Le joueur glisse le long des parois et doit les contourner.
- **Collecte :** ramassez les pépites en entrant dans leur zone de contact. Le compteur augmente à chaque collecte. Les pépites réapparaissent après 3 secondes.
- **Tutoriel :** un guide accompagne les premières actions (déplacement, collecte et invocation). Il peut être masqué et réapparaît au rechargement.

## Compagnons et invocations

Les pépites permettent d’invoquer des compagnons passifs. Le coût commence à **5 pépites** et augmente de 1 après chaque invocation réussie.

- Les doublons améliorent le niveau du compagnon jusqu’au niveau 3.
- Les compagnons au niveau maximal ne peuvent plus être tirés.
- L’invocation groupée permet d’utiliser plusieurs tirages en une fois.
- Les probabilités détaillées sont accessibles via l’aide « ? ».
- L’historique conserve les 5 dernières invocations.
- La progression est réinitialisée au rechargement de la page.

### Compagnons et bonus

| Compagnon | Rareté | Bonus par niveau |
|---|---|---|
| Moustique magnétique | Commun | Rayon de collecte +25 % |
| Lapin rapide | Commun | Vitesse du joueur +15 % |
| Écureuil prévoyant | Peu commun | Capacité de pépites à l’écran : +2, +4, puis +6 |
| Singe productif | Peu commun | Temps de réapparition des pépites −15 % |
| Crabe trou noir | Rare | Un jeton aspirant supplémentaire |
| Pie glaneuse | Rare | 2, 4, puis 6 fragments dans l’arène |

Les probabilités initiales des groupes de rareté sont de **50 % (commun), 35 % (peu commun) et 15 % (rare)**. Elles sont normalisées et redistribuées lorsque tous les compagnons d’un groupe sont au niveau maximal.

Les jetons violets du Crabe trou noir absorbent jusqu’aux 3 pépites les plus proches, créditent le compteur et réapparaissent après 6 secondes.

## Fragments et actions

Les fragments sont une ressource distincte des pépites. Les losanges verts apparaissent grâce à la Pie glaneuse. Chaque fragment ramassé augmente le compteur de 1 et réapparaît après 8 secondes.

Le panneau **Actions** permet de dépenser des fragments :

- **Supprimer un mur aléatoire :** coûte 10 fragments et supprime immédiatement un mur. L’action est enregistrée dans l’historique.
- **Invocation automatique :** se débloque pour 20 fragments. Une fois activée, elle invoque automatiquement un compagnon dès que les pépites nécessaires sont disponibles. Elle peut être activée ou désactivée à volonté.

Les boutons d’invocation deviennent jaunes lorsque les pépites sont suffisantes. Les actions payées en fragments deviennent vertes lorsqu’elles sont accessibles.

## Interface

L’arène conserve un format carré. Sur grand écran, les panneaux de ressources, d’actions et d’historique sont disposés à côté de l’arène. Sur téléphone, ils passent en dessous.

L’interface adopte une esthétique de fanzine photocopié : papier cassé, trames imprimées, contours noirs et accents rouge brique.

## Développement

```sh
npm install
npm run dev
```

## Tests et build

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

Le build statique est généré dans `dist/`.

## Déploiement GitHub Pages

GitHub Actions construit et déploie automatiquement le projet à chaque mise à jour de `main`.

- Pour un dépôt de projet, Vite utilise `/kattak/` comme chemin de base dans GitHub Actions.
- Pour un domaine personnalisé, définir `VITE_BASE_PATH=/` dans l’environnement du workflow.