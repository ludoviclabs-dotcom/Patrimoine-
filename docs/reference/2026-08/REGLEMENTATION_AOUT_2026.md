# PATRIMOINE FISCAL — RÉGLEMENTATION AU 18 AOÛT 2026

**État du droit et de la doctrine contrôlé au 18 août 2026.**  
**Usage :** référentiel produit, backlog réglementaire et base de validation des `rule_version`.  
**Avertissement :** ce document ne remplace pas une consultation juridique, fiscale, notariale ou comptable. Toute règle activée en production doit être relue sur son texte consolidé à sa date d’effet.

---

# 1. Cadre de fiabilité

## 1.1 Hiérarchie des sources

Ordre de confiance retenu :

1. Texte consolidé du CGI et lois publiées au Journal officiel ;
2. Règlements européens et normes homologuées ;
3. BOFiP opposable dans les conditions de l’article L. 80 A LPF ;
4. Jurisprudence publiée ;
5. Fiches officielles impots.gouv.fr, service-public.fr, economie.gouv.fr ;
6. Doctrine professionnelle secondaire, uniquement comme aide de lecture.

## 1.2 Statuts à stocker

| Statut | Signification produit |
|---|---|
| `verified_law` | Texte légal consolidé vérifié. |
| `verified_doctrine` | Doctrine administrative vérifiée et datée. |
| `case_law_review` | Jurisprudence pertinente, portée à qualifier. |
| `pending_doctrine` | Loi publiée, doctrine administrative non encore alignée. |
| `to_verify` | Source ou interprétation non suffisamment stabilisée. |
| `superseded` | Règle remplacée mais conservée pour les simulations historiques. |

## 1.3 Gel réglementaire

Le gel du 18 août 2026 doit être matérialisé par :

- un hash du texte source ;
- une date de collecte ;
- une date d’effet ;
- un statut d’approbation ;
- le nom du réviseur ;
- les moteurs et simulations impactés.

---

# 2. Loi de finances pour 2026

## 2.1 Texte de référence

**Loi n° 2026-103 du 19 février 2026 de finances pour 2026**, publiée au JORF du 20 février 2026 et, sauf disposition contraire, entrée en vigueur le 21 février 2026.

## 2.2 Synthèse des mesures patrimoniales utiles au produit

| Mesure | Texte | Date d’effet | Impact produit |
|---|---|---:|---|
| Barème IR revalorisé de 0,9 % | CGI art. 197 ; LF 2026 | Revenus 2025 imposés en 2026 | Nouvelle version de barème et golden cases. |
| CDHR reconduite | CGI art. 224 | Revenus 2026 ; acompte décembre 2026 | Moteur séparé, RREF validé, échéance 1–15 décembre. |
| Taxe holdings patrimoniales | CGI art. 235 ter C ; LF art. 7 | Exercices clos à compter du 31 décembre 2026 | Nouveau moteur, première campagne 2027. |
| Dutreil renforcé | CGI art. 787 B/C ; LF art. 8 | Transmissions depuis le 21 février 2026 | Conservation individuelle six ans et exclusion d’actifs. |
| Apport-cession renforcé | CGI art. 150-0 B ter ; LF art. 11 | Cessions depuis le 21 février 2026 | Remploi 70 % sous trois ans. |
| Modifications de dispositifs de donation historiques | LF 2026 et textes coordonnés | Selon article | Ne pas confondre avec la réduction Dutreil de l’art. 790. |

## 2.3 Barème de l’impôt sur le revenu 2026

Barème applicable aux revenus 2025 :

| Fraction de revenu imposable par part | Taux | Source |
|---:|---:|---|
| Jusqu’à 11 600 € | 0 % | CGI art. 197 |
| De 11 600 € à 29 579 € | 11 % | CGI art. 197 |
| De 29 579 € à 84 577 € | 30 % | CGI art. 197 |
| De 84 577 € à 181 917 € | 41 % | CGI art. 197 |
| Au-delà de 181 917 € | 45 % | CGI art. 197 |

Paramètres utiles :

- plafonnement ordinaire de l’avantage du quotient familial : **1 807 € par demi-part** ;
- décote célibataire : `max(0, 897 € – 45,25 % × impôt brut)` ;
- décote couple : `max(0, 1 483 € – 45,25 % × impôt brut)`.

Les plafonds spéciaux de demi-part doivent rester hors automatisation générique.

## 2.4 Contribution exceptionnelle sur les hauts revenus — CEHR

| Situation | 3 % | 4 % | Source |
|---|---:|---:|---|
| Célibataire | 250 000 à 500 000 € | > 500 000 € | CGI art. 223 sexies |
| Couple soumis à imposition commune | 500 000 à 1 000 000 € | > 1 000 000 € | CGI art. 223 sexies |

Le lissage des revenus exceptionnels exige un module ou une revue distincte.

## 2.5 Contribution différentielle sur les hauts revenus — CDHR

### Champ

- seuil célibataire : **250 000 €** de revenu de référence CDHR ;
- seuil couple : **500 000 €** ;
- objectif : taux minimal de **20 %** selon la formule légale ;
- abattement de sortie progressive jusqu’à **330 000 €** ou **660 000 €** ;
- minoration de **12 500 €** pour un couple ;
- minoration de **1 500 € par personne à charge** ;
- acompte de **95 %** entre le **1er et le 15 décembre 2026**.

### Formule simplifiée contrôlée

```text
CDHR = max(
  0,
  cible minimale après mécanisme d’entrée progressive
  – IR ajusté
  – CEHR
  – prélèvements légalement retenus
  – 12 500 € si couple
  – 1 500 € par personne à charge
)
```

Le produit ne doit jamais assimiler le `RFR` visible sur un avis au `RREF CDHR` sans reconstruction.

### Doctrine

Une mise à jour BOFiP spécifique a été publiée le **30 juin 2026**. Elle doit être la source doctrinale de la version 2026 du moteur.

---

# 3. PFU et prélèvements sociaux 2026

## 3.1 Origine du changement

Le passage courant de 30 % à **31,4 %** résulte principalement de la **LFSS pour 2026**, et non de la seule loi de finances :

- impôt sur le revenu : **12,8 %** ;
- prélèvements sociaux : **18,6 %** ;
- total : **31,4 %**.

Le moteur ne doit donc pas stocker `PFU_2026 = 31.4 %` comme constante universelle.

## 3.2 Matrice par produit

| Produit / gain | IR forfaitaire | Prélèvements sociaux 2026 | Total usuel | Revue |
|---|---:|---:|---:|---|
| Dividendes ordinaires | 12,8 % | 18,6 % | 31,4 % | Option globale au barème. |
| Intérêts ordinaires | 12,8 % | 18,6 % | 31,4 % | Dispense d’acompte ≠ exonération finale. |
| Plus-values mobilières | 12,8 % | 18,6 % | 31,4 % | Abattements historiques si option barème. |
| Crypto-actifs, activité privée | 12,8 % | 18,6 % | 31,4 % | Requalifier si activité professionnelle. |
| PEA avant cinq ans | 12,8 % | 18,6 % | 31,4 % | Exceptions et clôture à contrôler. |
| PEA après cinq ans | 0 % | 18,6 % | 18,6 % | Date et retraits à contrôler. |
| Assurance-vie, cas général | 7,5 % ou 12,8 % | **17,2 %** | Variable | Ancienneté, primes, encours, abattement. |
| Certains CEL/PEL/PEP historiques | Variable | **17,2 %** | Variable | Date d’ouverture. |
| Rente-survie / épargne handicap | Variable | 18,6 % | Variable | Contrat à qualifier. |
| Plus-value immobilière | 19 % | **17,2 %** | 36,2 % avant abattements/surtaxe | Moteur distinct. |

## 3.3 Option au barème

L’option est **globale** pour les revenus mobiliers éligibles du foyer. Pour les dividendes éligibles :

- abattement de 40 % pour l’IR ;
- prélèvements sociaux sur la base non réduite ;
- CSG déductible de 6,8 % sous conditions et avec effet temporel à modéliser.

Le cockpit doit comparer les méthodes au niveau du foyer, pas au niveau d’une ligne isolée.

## 3.4 Impact sur la démo Claire et Marc

- Remplacer toute constante globale `0.314` par un profil de taux par catégorie.
- Afficher « PFU standard 31,4 % » seulement pour les produits réellement concernés.
- Conserver l’assurance-vie à 17,2 % de prélèvements sociaux dans le cas général.
- Réexécuter les simulations historiques en conservant l’ancienne règle 30 % comme version `superseded`, sans écraser les runs.

---

# 4. IFI 2026

## 4.1 Seuil et barème

L’IFI est dû lorsque la valeur nette taxable est **strictement supérieure à 1,3 M€**. Le barème commence à 800 000 €.

| Fraction de patrimoine net taxable | Taux | Source |
|---:|---:|---|
| Jusqu’à 800 000 € | 0 % | CGI art. 977 |
| 800 000 à 1 300 000 € | 0,50 % | CGI art. 977 |
| 1 300 000 à 2 570 000 € | 0,70 % | CGI art. 977 |
| 2 570 000 à 5 000 000 € | 1,00 % | CGI art. 977 |
| 5 000 000 à 10 000 000 € | 1,25 % | CGI art. 977 |
| Au-delà de 10 000 000 € | 1,50 % | CGI art. 977 |

Décote pour une base comprise entre 1,3 M€ et 1,4 M€ :

```text
décote = 17 500 € – 1,25 % × patrimoine net taxable
```

Aucun changement général de seuil ou de barème IFI propre à la LF 2026 n’a été identifié dans le gel du 18 août 2026. La nouvelle taxe holding est distincte.

## 4.2 Résidence principale

- abattement de **30 %** si la résidence principale est détenue directement ;
- ne pas appliquer automatiquement cet abattement aux parts de SCI ;
- dette liée plafonnée, en pratique, à la valeur taxable après abattement pour éviter une base négative artificielle.

## 4.3 Dettes déductibles

Conditions cumulatives :

- dette existante au 1er janvier ;
- supportée par le redevable ;
- liée à un actif taxable ;
- objet légalement admis : acquisition, construction, reconstruction, agrandissement, amélioration, réparation, entretien et certains impôts ;
- justificatifs disponibles.

### Prêts in fine ou à remboursement non constant

```text
dette admise = capital initial
               – capital initial × années écoulées / durée totale
```

### Prêt sans terme

```text
dette admise = capital initial – capital initial / 20 × années écoulées
```

### Plafonnement dette

Si :

- patrimoine taxable brut > 5 M€ ;
- dettes admises > 60 % de ce patrimoine ;
- absence de preuve d’un objet non principalement fiscal ;

alors :

```text
dette déductible = 60 % du patrimoine
                    + 50 % de l’excédent de dette au-delà de 60 %
```

Exemple : actifs 6 M€, dettes 5,5 M€ → dette admise 4,55 M€.

## 4.4 Démembrement

Règle générale : l’usufruitier est imposé sur la pleine valeur. Les exceptions limitatives de l’article 968 permettent une ventilation selon l’article 669, notamment dans certaines situations d’usufruit légal ou de vente avec réserve d’usufruit à un tiers non lié.

Le moteur doit stocker le **fondement du démembrement**, pas seulement l’âge.

## 4.5 SCI et holdings

- calculer la fraction de valeur des titres représentative d’immobilier taxable ;
- neutraliser les actifs professionnels seulement sur preuve ;
- ne pas appliquer de décote standard sans justification ;
- tracer les chaînes de détention et dettes intragroupe ;
- revue obligatoire pour holding animatrice, biens mixtes, usufruit et conventions de trésorerie.

---

# 5. Plus-value immobilière 2026

## 5.1 Taux

- impôt sur le revenu : **19 %** ;
- prélèvements sociaux : **17,2 %** ;
- surtaxe de 2 % à 6 % au-delà de 50 000 € de plus-value taxable à l’IR, hors terrains à bâtir.

## 5.2 Détermination de la plus-value brute

```text
prix de cession corrigé
– prix d’acquisition
– frais d’acquisition réels ou forfait 7,5 %
– travaux éligibles réels ou forfait 15 % si immeuble bâti détenu > 5 ans
= plus-value brute
```

Les frais réels et forfaitaires ne se cumulent pas dans une même catégorie.

## 5.3 Tableau complet des abattements pour durée de détention

| Années révolues | Abattement IR cumulé | Abattement prélèvements sociaux cumulé |
|---:|---:|---:|
| 0 à 5 | 0 % | 0 % |
| 6 | 6 % | 1,65 % |
| 7 | 12 % | 3,30 % |
| 8 | 18 % | 4,95 % |
| 9 | 24 % | 6,60 % |
| 10 | 30 % | 8,25 % |
| 11 | 36 % | 9,90 % |
| 12 | 42 % | 11,55 % |
| 13 | 48 % | 13,20 % |
| 14 | 54 % | 14,85 % |
| 15 | 60 % | 16,50 % |
| 16 | 66 % | 18,15 % |
| 17 | 72 % | 19,80 % |
| 18 | 78 % | 21,45 % |
| 19 | 84 % | 23,10 % |
| 20 | 90 % | 24,75 % |
| 21 | 96 % | 26,40 % |
| 22 | 100 % | 28 % |
| 23 | 100 % | 37 % |
| 24 | 100 % | 46 % |
| 25 | 100 % | 55 % |
| 26 | 100 % | 64 % |
| 27 | 100 % | 73 % |
| 28 | 100 % | 82 % |
| 29 | 100 % | 91 % |
| 30 et plus | 100 % | 100 % |

Exonération totale :

- IR après 22 ans ;
- prélèvements sociaux après 30 ans.

## 5.4 Surtaxe des plus-values élevées

| Plus-value taxable IR | Formule |
|---:|---|
| 50 001 à 60 000 € | `2 % × PV – (60 000 – PV) / 20` |
| 60 001 à 100 000 € | `2 % × PV` |
| 100 001 à 110 000 € | `3 % × PV – (110 000 – PV) / 10` |
| 110 001 à 150 000 € | `3 % × PV` |
| 150 001 à 160 000 € | `4 % × PV – 15 % × (160 000 – PV)` |
| 160 001 à 200 000 € | `4 % × PV` |
| 200 001 à 210 000 € | `5 % × PV – 20 % × (210 000 – PV)` |
| 210 001 à 250 000 € | `5 % × PV` |
| 250 001 à 260 000 € | `6 % × PV – 25 % × (260 000 – PV)` |
| > 260 000 € | `6 % × PV` |

## 5.5 Exonération de résidence principale

Conditions :

- logement constituant la résidence principale **effective et habituelle** au jour de la cession ;
- occupation temporaire ou de pure convenance insuffisante ;
- dépendances immédiates et nécessaires exonérées si cédées simultanément ;
- terrain à bâtir en principe hors dépendance exonérée.

### Déménagement avant la vente

Tolérance si le bien :

- était occupé jusqu’à sa mise en vente ;
- reste vacant ;
- n’est ni loué ni prêté ;
- fait l’objet de diligences normales de vente ;
- est vendu dans un délai normal, **un an constituant un repère et non une règle absolue**.

Au-delà d’un an, le produit doit exiger une revue, pas refuser ou accepter automatiquement.

## 5.6 Autres exonérations à tester séparément

- prix de cession ≤ 15 000 € selon les règles par cédant/quote-part ;
- première cession d’un logement autre que la résidence principale avec remploi ;
- titulaires de pension vieillesse/carte mobilité inclusion sous conditions ;
- non-résidents ;
- expropriation/remploi ;
- cession à certains organismes de logement.

---

# 6. Transmission et donations

## 6.1 Barème DMTG en ligne directe

| Part taxable | Taux | Source |
|---:|---:|---|
| Jusqu’à 8 072 € | 5 % | CGI art. 777 |
| 8 072 à 12 109 € | 10 % | CGI art. 777 |
| 12 109 à 15 932 € | 15 % | CGI art. 777 |
| 15 932 à 552 324 € | 20 % | CGI art. 777 |
| 552 324 à 902 838 € | 30 % | CGI art. 777 |
| 902 838 à 1 805 677 € | 40 % | CGI art. 777 |
| Au-delà | 45 % | CGI art. 777 |

Paramètres :

- abattement parent/enfant : **100 000 €** ;
- rappel fiscal : **15 ans** ;
- le rappel consomme l’abattement et les tranches déjà utilisées ;
- abattement supplémentaire handicap : **159 325 €** sous conditions ;
- don familial de somme d’argent : **31 865 €**, sous conditions d’âge et de majorité, renouvelable selon le délai légal.

## 6.2 Autres liens de parenté et exonérations successorales

| Relation / opération | Abattement ordinaire | Tarif 2026 | Source |
|---|---:|---:|---|
| Donation entre époux ou partenaires de PACS | 80 724 € | Barème progressif : 5 %, 10 %, 15 %, 20 %, 30 %, 40 %, 45 % | CGI art. 777, 790 E et 790 F |
| Succession au conjoint survivant ou partenaire de PACS | Sans objet | **Exonération totale** | CGI art. 796-0 bis |
| Frère ou sœur, hors exonération successorale conditionnelle | 15 932 € | 35 % jusqu’à 24 430 €, puis 45 % | CGI art. 777 et 779 |
| Succession entre frère et sœur remplissant toutes les conditions légales | Sans objet | **Exonération totale** | CGI art. 796-0 ter |
| Neveu ou nièce | 7 967 € | 55 % | CGI art. 777 et 779 |
| Parent jusqu’au 4e degré inclus | À défaut d’autre abattement : 1 594 € en succession ; donation selon lien | 55 % | CGI art. 777 et 788 |
| Parent au-delà du 4e degré ou non-parent | À défaut d’autre abattement : 1 594 € en succession | 60 % | CGI art. 777 et 788 |

Points de vigilance :

- l’exonération de succession entre frère et sœur dépend notamment de la situation familiale, de l’âge ou de l’invalidité et d’une cohabitation continue répondant au texte ;
- la représentation peut modifier l’abattement et le tarif ;
- l’adoption simple exige une qualification au regard de l’article 786 ;
- l’abattement handicap de 159 325 € peut se cumuler sous conditions ;
- les transmissions internationales, legs particuliers et régimes territoriaux restent hors automatisation sans revue.

Le moteur TypeScript inclut désormais une liquidation multi-liens prudente et conserve des blocages de revue pour ces cas.

## 6.3 Déclaration dématérialisée des dons

Depuis le **1er janvier 2026**, la déclaration en ligne devient la voie obligatoire pour plusieurs catégories de dons manuels et sommes d’argent, sous réserve des exceptions et impossibilités prévues. Le produit doit :

- distinguer acte notarié et don manuel ;
- générer une checklist de déclaration, pas une déclaration juridique automatique ;
- conserver date, donateur, donataire, montant, nature, abattement mobilisé et référence de dépôt.

## 6.4 Exonération temporaire logement neuf/rénovation énergétique

Le dispositif de l’article **790 A bis**, issu de la loi de finances pour 2025, reste pertinent jusqu’au **31 décembre 2026** :

- dons de sommes d’argent en pleine propriété ;
- jusqu’à 100 000 € par donateur/donataire et 300 000 € par donataire ;
- affectation dans les six mois à un logement neuf/VEFA ou à certains travaux énergétiques de résidence principale ;
- conditions de durée, usage et non-cumul à vérifier.

Ce n’est pas une nouvelle mesure LF 2026 ; la règle doit conserver sa date d’origine.

---

# 7. Pacte Dutreil après LF 2026

## 7.1 Socle

Exonération de **75 %** de la valeur éligible des titres, sous conditions de l’article 787 B.

## 7.2 Changements depuis le 21 février 2026

**Règle de versionnement :** les transmissions réalisées du 1er janvier au 20 février 2026 restent soumises à la version antérieure de l’article 787 B : engagement individuel de quatre ans et absence d’application rétroactive de la nouvelle liste d’actifs exclus. La date du fait générateur doit donc sélectionner la version de règle, et non l’année civile seule.

### Conservation individuelle

L’engagement individuel passe de **quatre à six ans**.

### Actifs exclus

L’exonération ne s’applique pas à la fraction de valeur représentative des éléments non exclusivement affectés à l’activité pendant la période requise :

- chasse ;
- pêche ;
- véhicules de tourisme ;
- yachts, bateaux de plaisance et aéronefs ;
- bijoux, métaux précieux, objets d’art, de collection ou d’antiquité hors régime 238 bis AB ;
- chevaux de course ou de concours ;
- vins et alcools ;
- logements et résidences.

L’exclusion remonte aussi aux sociétés contrôlées. L’affectation opérationnelle doit, en principe, être établie pendant trois ans avant la transmission ou depuis l’acquisition si plus récente, et jusqu’au terme pertinent.

## 7.3 Seuils d’engagement

À contrôler selon société cotée/non cotée :

- cotée : au moins 10 % des droits financiers et 20 % des droits de vote ;
- non cotée : au moins 17 % des droits financiers et 34 % des droits de vote.

Les engagements réputés acquis, post mortem et autres mécanismes doivent être versionnés séparément.

## 7.4 Holding animatrice

La holding animatrice doit :

- participer activement à la conduite de la politique du groupe ;
- contrôler les filiales ;
- animer effectivement les filiales exerçant une activité éligible ;
- disposer de preuves contemporaines : procès-verbaux, conventions, reporting, décisions, prestations, moyens humains.

### Jurisprudence 2025

La décision **Cass. com., 17 décembre 2025, n° 24-17.415** renforce l’importance de la preuve :

- caractère opérationnel à apprécier au fait générateur ;
- charge de la preuve pesant sur le contribuable ;
- activité des filiales à établir ;
- une SCI non démontrée comme opérationnelle ne peut être traitée comme telle par simple affirmation.

Le ratio d’actifs opérationnels supérieur à la moitié constitue un indice, pas une règle automatique d’éligibilité.

## 7.5 Réduction de 50 % des droits — correction P0

L’article **790 CGI** prévoit toujours, au 18 août 2026, une réduction de **50 % des droits liquidés** lorsque :

- la donation porte en pleine propriété sur des titres éligibles Dutreil ;
- le donateur a moins de 70 ans.

Cette réduction **n’a pas été abrogée par la LF 2026**.

Le dépôt actuel contient une confusion avec l’ancien article **790 I**, dispositif distinct. La condition `donationBeforeFeb2026` doit être supprimée de `simulateDutreilV2` et remplacée par un test fondé sur l’article 790 : donation, pleine propriété, donateur < 70 ans, Dutreil validé.

---

# 8. Apport-cession — article 150-0 B ter

## 8.1 Régime à compter du 21 février 2026

Lorsque la société bénéficiaire de l’apport cède les titres apportés dans les trois ans de l’apport, le maintien du report exige notamment :

- engagement de réinvestir ;
- au moins **70 %** du produit de cession ;
- dans un délai de **trois ans** à compter de la cession ;
- dans les actifs, titres ou fonds éligibles ;
- conservation des actifs/titres concernés pendant au moins cinq ans lorsque la loi l’exige.

## 8.2 Versionnement historique

| Date de cession des titres apportés | Taux de remploi | Délai | Statut |
|---|---:|---:|---|
| Avant 1er janvier 2019 | 50 % | 2 ans | `[À VÉRIFIER BOFIP]` pour régimes anciens/transitoires. |
| 1er janvier 2019 – 20 février 2026 | 60 % | 2 ans | Version historique. |
| À compter du 21 février 2026 | 70 % | 3 ans | Droit positif LF 2026. |

## 8.3 Écart loi/doctrine

Une doctrine BOFiP antérieure peut encore afficher le régime 60 %/deux ans. La loi consolidée prévaut pour les cessions depuis le 21 février 2026. Jusqu’à mise à jour doctrinale :

- statut `pending_doctrine` ;
- source légale active ;
- revue obligatoire des activités et fonds éligibles ;
- aucune activation basée uniquement sur une page BOFiP ancienne.

---

# 9. Taxe sur les holdings patrimoniales — article 235 ter C

## 9.1 Date

Taxe due au titre des exercices clos **à compter du 31 décembre 2026**.

## 9.2 Conditions cumulatives à la clôture

1. valeur vénale de l’ensemble des actifs ≥ **5 M€** ;
2. contrôle ≥ 50 % par une personne physique, contrôle indirect/familial ou pouvoir de décision de fait ;
3. revenus passifs > **50 %** des produits d’exploitation et financiers, hors reprises de provisions/amortissements.

## 9.3 Revenus passifs

- dividendes ;
- intérêts et produits de créances/dépôts/cautionnements ;
- redevances de propriété intellectuelle ;
- droits d’auteur ;
- loyers ;
- produits de cession d’actifs générant ces revenus lorsqu’ils sont comptabilisés en produits.

Des neutralisations existent pour certaines conventions de trésorerie centralisée.

## 9.4 Liste fermée d’actifs taxables

- biens de chasse ;
- biens de pêche ;
- véhicules non professionnels et véhicules de tourisme ;
- yachts, bateaux de plaisance, aéronefs ;
- bijoux et métaux précieux, sous exceptions ;
- chevaux de course ou de concours ;
- vins et alcools ;
- logements dont la personne contrôlante se réserve la jouissance : gratuité, loyer sous marché ou location fictive.

Ne pas inclure par analogie :

- trésorerie ;
- titres financiers ;
- participations actives ;
- œuvres d’art comme catégorie générale.

## 9.5 Assiette et taux

```text
assiette = valeur vénale des actifs de la liste
           – fraction affectée à une activité opérationnelle
           – dettes d’acquisition admises pour les logements de jouissance

taxe = assiette × 20 %
```

Les règles de dette des logements reprennent :

- capital restant dû pour échéances constantes ;
- amortissement linéaire légal pour prêts in fine/non constants ;
- réduction d’un vingtième par an pour prêts sans terme ;
- exclusion des dettes liées, sauf preuve d’un objectif non principalement fiscal.

## 9.6 Impact produit

- ne pas présenter la taxe comme un « IFI des holdings » ;
- identifier la société redevable française ou, pour société étrangère, la personne physique française ;
- stocker inventaire d’actifs, usage, preuve, valeur et dette ;
- prévoir une annexe déclarative ;
- revue juridique obligatoire tant que la doctrine administrative n’est pas stabilisée.

---

# 10. Usufruit temporaire

## 10.1 Cession à titre onéreux

La première cession à titre onéreux d’un usufruit temporaire relève en principe de l’article **13, 5 CGI** : le produit est imposé dans la catégorie de revenus à laquelle se rattache le bien, au lieu du régime ordinaire de plus-value.

## 10.2 Jurisprudence 2026

Le **Conseil d’État, 30 mars 2026, n° 502243** confirme que le dispositif peut s’appliquer lorsque la contrepartie n’est pas seulement un prix en numéraire mais prend la forme de titres ou droits sociaux.

## 10.3 Conséquence produit

- détecter `temporary_usufruct = true` dès la qualification ;
- bloquer le moteur de plus-value immobilière standard ;
- router vers une analyse par catégorie de revenus ;
- revue avocat/notaire obligatoire ;
- aucune « exonération usufruit temporaire LF 2026 » générique ne doit être créée : une telle mesure n’a pas été identifiée dans le gel.

---

# 11. Loi de finances rectificative 2026

Au **18 août 2026**, aucune loi de finances rectificative 2026 promulguée et pertinente pour ce périmètre n’a été identifiée dans les corpus officiels contrôlés.

Cette phrase ne doit pas devenir une règle permanente. Elle doit être stockée comme constat daté :

```yaml
checked_at: 2026-08-18
status: no_promulgated_text_identified
human_review_required: true
next_check_at: 2026-08-25
```

Mention produit : **[À REVALIDER AVANT CHAQUE RELEASE]**.

---

# 12. BOFiP 2025–2026

## 12.1 CDHR

- doctrine dédiée mise à jour le 30 juin 2026 ;
- intégrer définitions, entrée progressive, impôts retenus, revenus exceptionnels et acompte ;
- source à considérer comme P0.

## 12.2 Apport-cession

- doctrine potentiellement en retard sur la LF 2026 ;
- conserver une alerte `law_doctrine_mismatch` ;
- ne pas rétrograder la loi vers 60 %/deux ans.

## 12.3 Dutreil / holding animatrice

Aucune doctrine BOFiP 2026 pleinement alignée sur les exclusions et les six ans n’a été confirmée dans le gel. Statut : `pending_doctrine`.

Actions :

- surveiller ENR-DMTG-10-20-40 ;
- relier la jurisprudence du 17 décembre 2025 ;
- construire une checklist de preuve ;
- ne pas transformer un ratio d’actifs en safe harbor automatique.

## 12.4 SCI

Les sujets SCI traversent plusieurs séries : revenus fonciers, BIC/IS, IFI, plus-values et Dutreil. Il ne faut pas créer une seule règle « SCI 2026 ». Les décisions doivent dépendre de :

- transparence IR ou IS ;
- activité civile ou commerciale ;
- location nue, meublée ou mise à disposition ;
- détention directe/indirecte ;
- usage professionnel ;
- résidence principale ;
- animation de groupe.

## 12.5 Gouvernance de doctrine

- [ ] Capture du texte et hash.
- [ ] Date de dernière mise à jour officielle.
- [ ] Diff sémantique.
- [ ] Qualification : clarification ou changement de calcul.
- [ ] Liste des règles impactées.
- [ ] Revue humaine.
- [ ] Golden cases mis à jour.
- [ ] Activation datée.

---

# 13. Comptabilité — PCG 2025–2026

## 13.1 Modernisation des états financiers

Le règlement ANC n° 2022-06 s’applique aux exercices ouverts à compter du **1er janvier 2025**. Principaux impacts :

- définition plus restrictive du résultat exceptionnel ;
- suppression/reclassement de plusieurs transferts de charges ;
- nouveaux modèles d’états financiers et d’annexe ;
- adaptation des plans de comptes et mappings.

Le produit ne doit pas considérer tout événement patrimonial non récurrent comme « exceptionnel » au sens comptable.

## 13.2 Règlements ANC 2025–2026 à suivre

| Texte | Sujet | Impact produit | Statut au gel |
|---|---|---|---|
| ANC 2024-07 | Dette / autres fonds propres | Classification de certains instruments de holdings. | Vérifier homologation et date d’application dans la source ANC/JO. |
| ANC 2026-01 | Actifs numériques | Peut affecter holdings détenant crypto-actifs. | En cours d’homologation lors du contrôle de juillet 2026 ; ne pas activer sans JO. |
| ANC 2026-03 | Chiffre d’affaires | Présentation/reconnaissance des produits. | Contrôler publication et entrée en vigueur. |
| ANC 2026-04 | Impôt sur le résultat et contributions | Comptabilisation de taxes et contributions. | Contrôler texte homologué et date exacte d’application. |

Toute règle ANC n’est obligatoire qu’après homologation/publication selon son régime. Le watcher doit distinguer : projet, règlement adopté, homologué, publié, applicable.

## 13.3 SCI

### SCI à l’IR

- comptabilité souvent adaptée aux besoins juridiques/fiscaux, mais tenue rigoureuse indispensable ;
- distinction revenus fonciers, comptes courants, travaux, intérêts et répartition associés ;
- pas de génération automatique d’états « IFRS ».

### SCI à l’IS

- PCG complet ;
- amortissements ;
- distinction valeur comptable/valeur vénale ;
- plus-value professionnelle ;
- impôt différé seulement si référentiel/consolidation concerné.

### Holding

- titres de participation et autres titres ;
- conventions de trésorerie ;
- comptes courants ;
- produits de participation ;
- intégration fiscale et régime mère-fille hors périmètre du moteur patrimonial simplifié.

---

# 14. IFRS applicables aux SCI et holdings

## 14.1 Champ réel

Une SCI ou holding française n’applique pas automatiquement les IFRS dans ses comptes sociaux. Les IFRS deviennent pertinentes notamment :

- dans les comptes consolidés d’un groupe coté soumis aux IFRS adoptées par l’Union européenne ;
- si une entité entre dans un périmètre de consolidation IFRS ;
- pour un reporting groupe volontaire/contractuel.

Le produit doit demander le référentiel avant d’afficher un traitement IFRS.

## 14.2 Normes clés

| Norme | Sujet | Application patrimoniale |
|---|---|---|
| IAS 40 | Immeubles de placement | Coût ou juste valeur selon politique ; loyers/valorisation. |
| IFRS 10 | Contrôle et consolidation | Qualification filiales, entités d’investissement et contrôle de fait. |
| IFRS 9 | Instruments financiers | Classement/évaluation des titres, créances et dettes. |
| IFRS 13 | Juste valeur | Hiérarchie, techniques de valorisation et disclosures. |
| IAS 28 | Participations dans entreprises associées/coentreprises | Mise en équivalence. |
| IAS 12 | Impôts sur le résultat | Impôts différés, notamment sur juste valeur/amortissements. |
| IFRS 7 | Informations sur instruments financiers | Risques et informations à fournir. |

## 14.3 Évolutions 2026

Les améliorations annuelles IFRS « Volume 11 » sont applicables à compter du 1er janvier 2026 pour les normes concernées. Les projets ou consultations IASB ne doivent pas être présentés comme applicables avant leur date effective et leur adoption UE.

IFRS 18 est à préparer pour 2027, mais ne doit pas être annoncée comme applicable en 2026 sauf adoption anticipée autorisée et documentée.

---

# 15. Facturation électronique

## 15.1 Calendrier exact au 18 août 2026

| Date | Obligation | Entreprises concernées |
|---:|---|---|
| **1er septembre 2026** | Capacité de réception des factures électroniques | Toutes les entreprises assujetties établies en France concernées. |
| **1er septembre 2026** | Émission e-invoice et e-reporting | Grandes entreprises et ETI. |
| **1er septembre 2027** | Émission e-invoice et e-reporting | PME, TPE et micro-entreprises. |

Au 18 août 2026, la première échéance est **future de quatorze jours**. Le produit ne doit pas écrire « obligation en vigueur depuis le 1er septembre » avant cette date.

## 15.2 Distinction des flux

- B2B domestique dans le champ : facture électronique via plateforme agréée ;
- B2C et opérations internationales : e-reporting selon les règles ;
- réception obligatoire avant émission pour les petites structures.

## 15.3 Impact sur Patrimoine Fiscal

Le produit n’est pas un opérateur de facturation, mais le module cabinet doit :

- corriger la timeline 2026/2027 ;
- afficher la catégorie de l’entreprise ;
- distinguer réception, émission et e-reporting ;
- collecter le statut de plateforme agréée ;
- ne pas promettre une connexion native sans intégration réelle ;
- versionner la fiche réglementaire.

### Timeline produit recommandée au 18 août 2026

```text
18 août 2026 : préparation finale — réception obligatoire dans 14 jours
1 septembre 2026 : réception pour tous ; émission/e-reporting GE et ETI
1 septembre 2027 : émission/e-reporting PME, TPE et micro
```

---

# 16. AI Act

## 16.1 Qualification du moteur déterministe

Un moteur TypeScript déterministe qui applique des barèmes et formules explicites **n’est pas, par lui-même, un système d’IA**. Il relève d’un logiciel de calcul classique.

## 16.2 Copilote LLM éventuel

Un assistant qui :

- explique les résultats ;
- extrait des informations de documents ;
- suggère des questions ;
- prépare un brouillon non contraignant ;

n’est pas automatiquement « à haut risque » au titre de l’article 6 et de l’annexe III. Le conseil fiscal/patrimonial n’est pas explicitement listé comme catégorie autonome de l’annexe III.

## 16.3 Cas de bascule vers le haut risque

Requalifier si le système sert, par exemple, à :

- évaluer la solvabilité ou le score de crédit d’une personne ;
- tarifer/évaluer certains risques d’assurance vie ou santé ;
- prendre une décision d’accès à un service essentiel ;
- recruter/évaluer un salarié ;
- rendre une décision relevant d’une catégorie de l’annexe III.

Un composant réutilisé dans un cas haut risque hérite d’obligations différentes.

## 16.4 Obligations applicables au produit actuel

### Depuis le 2 février 2025

- pratiques interdites ;
- **AI literacy** pour les personnes opérant l’IA, article 4.

### Depuis le 2 août 2026

Le règlement est largement applicable. Pour un copilote non haut risque :

- transparence lors de l’interaction avec une IA, lorsque l’utilisateur ne peut raisonnablement le savoir ;
- identification des contenus synthétiques lorsque l’article 50 l’exige ;
- gouvernance fournisseur et protection des données ;
- supervision humaine conformément au design produit.

### Si haut risque

- gestion des risques ;
- gouvernance des données ;
- documentation technique ;
- journalisation ;
- transparence et instructions ;
- supervision humaine ;
- exactitude, robustesse et cybersécurité ;
- qualité et surveillance post-marché.

## 16.5 Décision produit

Classification recommandée :

```yaml
component: deterministic_tax_engine
ai_system: false
risk_class: not_applicable

component: llm_explanation_copilot
ai_system: true
annex_iii_high_risk: false_by_default
human_review_required: true
binding_decision_allowed: false
```

Cette conclusion est une classification produit, pas une certification. Elle doit être revue si les finalités changent.

## 16.6 Gouvernance minimale avant runtime IA

- inventaire des cas d’usage ;
- modèle/fournisseur/version ;
- prompt système versionné ;
- données autorisées/interdites ;
- évaluations fiscales et sécurité ;
- citations obligatoires ;
- interdiction de modifier un calcul déterministe ;
- journal des sorties ;
- mécanisme de signalement ;
- validation humaine ;
- information utilisateur ;
- plan d’incident et de retrait.

---

# 17. Registre des incompatibilités P0 du produit

| ID | Constat | Risque | Correction |
|---|---|---|---|
| TAX-P0-001 | Réduction Dutreil reliée à l’ancien art. 790 I et désactivée après février 2026. | Surévaluation des droits ; conseil erroné. | Utiliser CGI art. 790, sans condition de date LF 2026. |
| TAX-P0-002 | PFU 31,4 % traité comme constante globale. | Sur/sous-imposition de produits à 17,2 % sociaux. | Profil de taux par catégorie. |
| TAX-P0-003 | Apport-cession susceptible de conserver 60 %/deux ans. | Non-respect du droit depuis 21 février 2026. | 70 %/trois ans, règle datée. |
| TAX-P0-004 | Taxe holding potentiellement calculée sur tous actifs passifs. | Assiette fictive. | Liste fermée art. 235 ter C. |
| TAX-P0-005 | Timeline e-facturation présentée sans date relative correcte. | Information obsolète ou prématurée. | État daté au 18 août puis bascule au 1er septembre. |
| TAX-P0-006 | Résidence principale automatisée par simple case à cocher. | Exonération indue. | Questionnaire factuel et statut `professional_review`. |
| TAX-P0-007 | Régime Dutreil 2026 sélectionné par année, sans pivot au 21 février. | Application rétroactive des six ans et des exclusions d’actifs. | Versionner 1er janvier–20 février puis 21 février–31 décembre. |

---

# 18. Checklist de mise en production réglementaire

## Fiscalité

- [ ] Barèmes 2026 signés et hashés.
- [ ] PFU différencié par produit.
- [ ] RREF CDHR validé séparément du RFR.
- [ ] Dettes IFI avec mode d’amortissement légal.
- [ ] Tableau plus-value 0–30 ans testé.
- [ ] Résidence principale avec dossier de preuve.
- [ ] Dutreil versionné : quatre ans avant le 21 février, six ans et exclusions à compter de cette date.
- [ ] Article 790 corrigé et golden test de non-régression.
- [ ] Apport-cession 70 %/trois ans.
- [ ] Taxe holding à liste fermée, première clôture 31 décembre 2026.
- [ ] LFR recontrôlée avant release.

## Comptabilité

- [ ] Référentiel PCG/IFRS choisi par dossier.
- [ ] Mapping ANC 2022-06 actif pour exercices 2025+.
- [ ] Statut d’homologation des règlements ANC stocké.
- [ ] Aucun projet ANC/IASB présenté comme norme applicable.

## Facturation électronique

- [ ] Catégorie GE/ETI/PME/TPE/micro stockée.
- [ ] Réception séparée d’émission/e-reporting.
- [ ] Date exacte et état passé/futur calculés.

## IA Act

- [ ] Moteur déterministe séparé du copilote.
- [ ] Mémo de classification.
- [ ] Transparence article 50.
- [ ] AI literacy article 4.
- [ ] Supervision humaine et interdiction de décision autonome.
- [ ] Reclassification automatique du projet si finalité modifiée.

---

# 19. Sources officielles à maintenir dans le registre

- Loi n° 2026-103 du 19 février 2026 de finances pour 2026.
- Loi n° 2025-1403 du 30 décembre 2025 de financement de la sécurité sociale pour 2026.
- CGI consolidé : art. 13, 150-0 B ter, 150 U à 150 VH, 1609 nonies G, 197, 200 A, 223 sexies, 224, 777, 779, 784, 787 B, 790, 964 à 983, 235 ter C.
- BOI-IR-BASE-50-10-40, mise à jour du 30 juin 2026.
- BOFiP : PAT-IFI, RFPI-PVI, RPPM-PVBMI, ENR-DMTG.
- Cass. com., 17 décembre 2025, n° 24-17.415.
- CE, 30 mars 2026, n° 502243.
- ANC : PCG 2026 et règlements homologués.
- IFRS Foundation et règlement européen d’adoption des IFRS.
- Règlement (UE) 2024/1689 sur l’intelligence artificielle.
- Portail officiel de la facturation électronique et economie.gouv.fr.

