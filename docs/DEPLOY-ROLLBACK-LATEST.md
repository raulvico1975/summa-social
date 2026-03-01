# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 20:50
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 5c72c78
SHA main a publicar: ded87d4

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ded87d4 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 5c72c78
git push origin prod --force-with-lease
```
