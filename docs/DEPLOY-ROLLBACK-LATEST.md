# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 20:30
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 861cb3c
SHA main a publicar: bca97be

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert bca97be --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 861cb3c
git push origin prod --force-with-lease
```
