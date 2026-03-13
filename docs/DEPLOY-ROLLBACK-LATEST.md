# Rollback Plan (auto) — Summa Social

Generat: 2026-03-13 12:03
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: f8544f8
SHA main a publicar: 0e5ac8e

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 0e5ac8e --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard f8544f8
git push origin prod --force-with-lease
```
