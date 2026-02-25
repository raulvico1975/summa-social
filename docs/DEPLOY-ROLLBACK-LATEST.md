# Rollback Plan (auto) — Summa Social

Generat: 2026-02-25 12:08
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: ce56ff2
SHA main a publicar: 1a1c0d1

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 1a1c0d1 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ce56ff2
git push origin prod --force-with-lease
```
