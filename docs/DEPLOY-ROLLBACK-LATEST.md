# Rollback Plan (auto) — Summa Social

Generat: 2026-02-25 09:17
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 8e93bb0
SHA main a publicar: 629a9e6

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 629a9e6 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 8e93bb0
git push origin prod --force-with-lease
```
