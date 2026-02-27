# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 15:47
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: f81250b
SHA main a publicar: c28fc9c

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert c28fc9c --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard f81250b
git push origin prod --force-with-lease
```
