# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 18:09
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 97321ac
SHA main a publicar: d4b42bb

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert d4b42bb --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 97321ac
git push origin prod --force-with-lease
```
