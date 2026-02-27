# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 13:15
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 2f6ea16
SHA main a publicar: 2e5509e

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 2e5509e --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 2f6ea16
git push origin prod --force-with-lease
```
