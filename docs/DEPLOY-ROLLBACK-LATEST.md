# Rollback Plan (auto) — Summa Social

Generat: 2026-03-24 10:04
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a3f93ce1
SHA branca a publicar (codex/release-3-returns-inactive-20260324): 9b48b8d6

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/release-3-returns-inactive-20260324
git revert 9b48b8d6 --no-edit
git push origin codex/release-3-returns-inactive-20260324
bash scripts/deploy.sh codex/release-3-returns-inactive-20260324
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a3f93ce1
git push origin prod --force-with-lease
```
