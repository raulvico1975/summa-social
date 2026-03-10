# Rollback Plan (auto) — Summa Social

Generat: 2026-03-10 23:25
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: d73d1dc
SHA main a publicar: 0e2edb3

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 0e2edb3 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard d73d1dc
git push origin prod --force-with-lease
```
