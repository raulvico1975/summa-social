# Rollback Plan (auto) — Summa Social

Generat: 2026-03-14 09:57
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: d0fcba5
SHA main a publicar: c5dc9ce

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert c5dc9ce --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard d0fcba5
git push origin prod --force-with-lease
```
