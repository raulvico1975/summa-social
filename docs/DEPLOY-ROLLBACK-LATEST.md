# Rollback Plan (auto) — Summa Social

Generat: 2026-03-09 15:07
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 814983ae
SHA main a publicar: 915deb98

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 915deb98 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 814983ae
git push origin prod --force-with-lease
```
