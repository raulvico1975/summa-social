# Rollback Plan (auto) — Summa Social

Generat: 2026-03-09 16:08
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 6e7cbcc
SHA main a publicar: d48076f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert d48076f --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 6e7cbcc
git push origin prod --force-with-lease
```
