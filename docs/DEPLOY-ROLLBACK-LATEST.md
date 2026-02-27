# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 16:16
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 942a095
SHA main a publicar: 188437f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 188437f --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 942a095
git push origin prod --force-with-lease
```
