# Rollback Plan (auto) — Summa Social

Generat: 2026-03-20 12:37
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 153cf66
SHA main a publicar: 1c21e36

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 1c21e36 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 153cf66
git push origin prod --force-with-lease
```
