# Rollback Plan (auto) — Summa Social

Generat: 2026-02-18 14:51
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 4dd1517
SHA main a publicar: 8fe43b6

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 8fe43b6 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 4dd1517
git push origin prod --force-with-lease
```
