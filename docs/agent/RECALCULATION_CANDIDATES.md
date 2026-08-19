# REGISTRE DES CANDIDATS AU RECALCUL

Créé : 2026-08-19 (PF-02)
Statut du registre : actif

Ce registre recense les runs de simulation produits sous une règle depuis
corrigée. **Aucune migration automatique n'a été exécutée et aucun résultat
historique n'a été réécrit** : conformément à `docs/rule-governance.md`, la
reprise d'un dossier relève d'une décision humaine, dossier par dossier.

Statut initial de toutes les entrées : `IDENTIFIED_NOT_MIGRATED`.

---

## 1. Dutreil — réduction de 50 % de l'art. 790 CGI

| Champ | Valeur |
|---|---|
| Moteur | `simulateDutreilV2` (`lib/tax/v2-engines.ts`) |
| Règle concernée | `rule-dutreil-2026-v3` → corrigée par `rule-dutreil-2026-v4` |
| Run correctif | PF-01 |
| Comportement erroné | La réduction de 50 % était rattachée à l'ancien art. 790 **I** et refusée pour toute donation postérieure au 21/02/2026. |
| Comportement corrigé | L'art. 790 CGI n'a pas été abrogé par la LF 2026 : la réduction s'applique à toute donation en pleine propriété de titres éligibles par un donateur de moins de 70 ans, sans condition de date. |
| Période potentiellement affectée | Toute donation liquidée sous la V3 avec un fait générateur à compter du 21/02/2026. |
| Sens de l'erreur | **Surévaluation des droits** (défavorable au client) — 39 097 € sur le cas de référence 2 M€. |
| Sévérité | Élevée — conseil erroné dans un sens défavorable. |
| Statut de migration | `IDENTIFIED_NOT_MIGRATED` |
| Validation humaine requise | Oui — notaire, sur chaque dossier repris. |

## 2. PEA — prélèvements sociaux par défaut

| Champ | Valeur |
|---|---|
| Moteur | `simulatePeaWithdrawalV2` (`lib/tax/v2-engines.ts`) |
| Règle concernée | `rule-pea-withdrawal-2026-v1` → corrigée par `rule-pea-withdrawal-2026-v2` |
| Run correctif | PF-01C1 |
| Comportement erroné | Taux social par défaut de **17,2 %**, alors que le PEA ne figure pas parmi les produits dérogatoires maintenus à ce taux. |
| Comportement corrigé | **18,6 %** à compter du pivot LFSS 2026 (01/01/2026) ; 17,2 % conservés pour un fait générateur antérieur. |
| Période potentiellement affectée | Retraits dont le fait générateur est postérieur au 01/01/2026, calculés sans override explicite. |
| Sens de l'erreur | **Sous-estimation** des prélèvements sociaux de 1,4 point (560 € sur 40 000 € de gains). |
| Sévérité | Moyenne — écart de taux limité mais systématique. |
| Statut de migration | `IDENTIFIED_NOT_MIGRATED` |
| Validation humaine requise | Oui — CGP, avec contrôle du décompte bancaire. |

## 3. Apport-cession — art. 150-0 B ter

| Champ | Valeur |
|---|---|
| Moteur | `simulateApportCessionV2` (`lib/tax/v2-engines.ts`) |
| Règle concernée | `rule-apport-cession-2026-v2` → remplacée par `rule-apport-cession-2019-v1` et `rule-apport-cession-2026-v3` (une par régime) |
| Run correctif | PF-01C2 |
| Comportement erroné | Seuil de 70 %, délai de 36 mois et conservation de 5 ans appliqués **quelle que soit la date de cession** : le régime LF 2026 était rétro-appliqué. |
| Comportement corrigé | Régime résolu par la **date de cession des titres apportés** : 60 % / 2 ans / 12 mois du 01/01/2019 au 20/02/2026 ; 70 % / 3 ans / 5 ans à compter du 21/02/2026. |
| Période potentiellement affectée | Tout dossier portant sur une cession **antérieure au 21/02/2026**. |
| Sens de l'erreur | Dossiers évalués contre un **seuil trop élevé** et une **conservation trop longue** : un report en réalité maintenu a pu être présenté comme fragilisé. |
| Sévérité | Élevée — conclusion potentiellement inversée sur le maintien du report. |
| Statut de migration | `IDENTIFIED_NOT_MIGRATED` |
| Validation humaine requise | Oui — avocat fiscaliste, avec reprise de la date de cession réelle. |

## 4. Taxe holding — art. 235 ter C

| Champ | Valeur |
|---|---|
| Moteur | `simulateHoldingTaxV2` (`lib/tax/v2-engines.ts`) |
| Règle concernée | `rule-holding-tax-2026-v2` → corrigée par `rule-holding-tax-2026-v3` |
| Run correctif | PF-01C3 |
| Comportement erroné | Assiette **ouverte** : `biens somptuaires + actifs financiers + immobilier + liquidités`, puis × 20 %. Trésorerie et titres financiers étaient taxés par analogie. |
| Comportement corrigé | Assiette limitée à la **liste fermée** du II A, après exclusion de l'affectation opérationnelle et déduction des seules dettes d'acquisition des logements visés. |
| Période potentiellement affectée | Tout dossier dont l'inventaire portait un montant en actifs financiers ou en liquidités. |
| Sens de l'erreur | **Surévaluation de la taxe** — 20 % appliqués à des actifs hors champ. |
| Sévérité | Élevée — assiette fictive. |
| Statut de migration | `IDENTIFIED_NOT_MIGRATED` |
| Validation humaine requise | Oui — avocat fiscaliste, avec recatégorisation de l'inventaire d'actifs. |

---

## Entrées connexes, sans recalcul requis

Ces corrections modifient le contrat du moteur sans invalider un montant déjà
liquidé, soit parce qu'elles rendent une abstention explicite, soit parce
qu'elles ne changent pas le résultat du cas nominal.

| Sujet | Run | Raison |
|---|---|---|
| Résidence principale (TAX-P0-006) | PF-01B | Une exonération accordée à tort sur simple booléen devient `needs_review`. Les dossiers concernés doivent être **requalifiés**, non recalculés à l'identique : l'issue dépend de faits qui n'avaient jamais été collectés. |
| PFU par catégorie (TAX-P0-002) | PF-01C1 | Les dividendes et plus-values mobilières conservent 31,4 % : aucun montant nominal ne change. Seul le PEA est concerné (entrée n° 2). |
| Timeline e-facturation (TAX-P0-005) | PF-01C4 | Information d'échéance, sans montant fiscal liquidé. |

---

## Procédure de reprise recommandée

1. Identifier les runs concernés par `ruleVersionId` archivée (le registre
   conserve les versions historiques : elles restent résolvables).
2. Rejouer le moteur en fournissant les **données opératives désormais
   requises** (date de cession, catégorie d'actif, faits de résidence
   principale, taille d'entreprise).
3. Comparer l'ancien et le nouveau résultat, sans écraser l'historique.
4. Faire valider l'écart par le professionnel compétent avant toute
   communication au client.
