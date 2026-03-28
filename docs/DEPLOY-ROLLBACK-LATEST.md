# Rollback Plan (auto) — Summa Social

Generat: 2026-03-28 11:22
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 0a3894f2
SHA branca a publicar (codex/blog-premium-review-20260328-prod): 866628f9

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/blog-premium-review-20260328-prod
git revert 866628f9 --no-edit
git push origin codex/blog-premium-review-20260328-prod
bash scripts/deploy.sh codex/blog-premium-review-20260328-prod
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 0a3894f2
git push origin prod --force-with-lease
```
