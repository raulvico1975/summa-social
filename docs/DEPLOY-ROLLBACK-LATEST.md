# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 14:25
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 6534536
SHA main a publicar: 5bfc326

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 5bfc326 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 6534536
git push origin prod --force-with-lease
```
