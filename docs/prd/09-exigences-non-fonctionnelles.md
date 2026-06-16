# 9. Exigences non-fonctionnelles

[← Architecture technique](08-architecture-technique.md) · [Sommaire](README.md) · [Chapitre suivant → Succès & mesure](10-succes-mesure.md)

---

| Domaine | Exigence | Cible / mesure |
|---|---|---|
| **Sécurité & RBAC** | Capacités centralisées, gardes serveur sur **chaque** action ; secrets hors dépôt | 0 action mutante sans garde ; `SESSION_SECRET` en env |
| **Authentification** | Session signée 30 j, scrypt, rate-limit | 5 essais / 10 min ; révocation via `pv` |
| **Confidentialité financière** | Masquage des marges par rôle, **y compris** dans les réponses IA | Aucune marge exposée à un rôle non habilité |
| **Audit / journalisation** | Mutations et interactions IA traçables | Qui · quoi · quand · quelle donnée vue |
| **Performance** | Calculs en mémoire sur volumes PME ; requêtes ciblées par fenêtre temporelle | Pas de N+1 ; rendu page pilotage < ~1 s en conditions normales |
| **Fiabilité des chiffres** | Source de calcul **unique** (fonctions pures), couvertes par tests | Cohérence garantie entre toutes les pages |
| **Observabilité** | Logs structurés, suivi d'erreurs, métriques d'usage IA | Coût / latence / taux de validation IA suivis |
| **Disponibilité & données** | Sauvegardes régulières de la base ; migrations versionnées et réversibles | RPO/RTO à définir ; `drizzle migrate` traçable |
| **i18n / a11y** | FR par défaut ; contrastes & navigation clavier | Conformité raisonnable WCAG AA visée |
| **Compatibilité** | Desktop (sidebar) + mobile/tablette (barre + panneau) | Parité fonctionnelle des deux dispositions |
| **Qualité / CI** | Lint + types stricts + tests avant build | `verify:ci` vert obligatoire |

_Note : les cibles chiffrées non encore arbitrées (RPO/RTO, budgets latence IA) sont à figer avec la direction technique._
