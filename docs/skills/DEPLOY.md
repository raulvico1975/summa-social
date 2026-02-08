# Skill: Deploy verificat

## Definició

Un **deploy verificat** és un commit servit per Firebase App Hosting des de la branca `prod`.
"Push a git" NO és sinònim de "ja està en producció".

---

## Ritual (main → master → prod)

**Requisit previ:** el CEO ha donat l'ordre explícita `"Autoritzo deploy"`.

```bash
# 1) main → master
git checkout master
git pull --ff-only
git merge --no-ff main
git push origin master

# 2) master → prod
git checkout prod
git pull --ff-only
git merge master
git push origin prod
```

Tornar a `main` després:
```bash
git checkout main
```

---

## Post-deploy check (obligatori)

1. **Confirmar SHA servit:** verificar a la consola de Firebase App Hosting que el commit desplegat coincideix amb el SHA pushejat a `prod`.
2. **Smoke test:** carregar l'app al navegador — una ruta pública + una ruta de dashboard (si hi ha accés) i confirmar que respon correctament.

---

## Rollback

```bash
git checkout prod
git reset --hard <SHA_BON>
git push --force-with-lease
```

Firebase App Hosting redesplegarà automàticament.

**Regla:** Rollback sempre des de `prod`, mai des de `master`.

---

**Document de referència complet:** `docs/GOVERN-DE-CODI-I-DEPLOY.md`
