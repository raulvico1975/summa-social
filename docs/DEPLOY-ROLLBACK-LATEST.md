# Rollback Plan (auto) — Summa Social

Generat: 2026-06-11 17:02
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 9ab24bc52
SHA branca a publicar (main): ff0dedf58

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ff0dedf58 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 9ab24bc52
git push origin prod --force-with-lease
```
