# Rollback Plan (auto) — Summa Social

Generat: 2026-03-20 12:50
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 447b38a3
SHA main a publicar: a5185bf1

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert a5185bf1 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 447b38a3
git push origin prod --force-with-lease
```
