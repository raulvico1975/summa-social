# Skill: Deploy verificat

## Definició

Un **deploy verificat** és un commit servit per Firebase App Hosting des de la branca `prod`.
"Push a git" NO és sinònim de "ja està en producció".

---

## Execució

**Requisit previ:** el CEO ha donat l'ordre explícita `"Autoritzo deploy"`.

```bash
npm run publica
```

Això executa el ritual de deploy complet de forma determinista i bloquejant:
1. Preflight git (branca=main, working tree net, pull ff-only)
2. Detectar canvis i classificar risc
3. Verificació fiscal (bloquejant si toca àrea fiscal)
4. Verificacions locals (verify-local.sh + verify-ci.sh)
5. Confirmació final
6. Merge main→prod + push
7. Post-deploy check automàtic (SHA + smoke test amb URL auto-resolta)
8. Registre a `docs/DEPLOY-LOG.md`

El script gestiona conflictes de merge, verificacions fallides i abort net.

---

## Rollback

```bash
git checkout prod
git reset --hard <SHA_BON>
git push --force-with-lease
```

Firebase App Hosting redesplegarà automàticament.

**Regla:** Rollback sempre des de `prod`.

---

**Document de referència complet:** `docs/GOVERN-DE-CODI-I-DEPLOY.md`
