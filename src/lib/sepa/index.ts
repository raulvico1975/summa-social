/**
 * SEPA Utilities
 *
 * Eines per treballar amb fitxers SEPA (pain.001 i pain.008)
 */

export {
  parsePain001,
  isPain001File,
  type Pain001Payment as ParsedPain001Payment,
  type Pain001ParseResult,
} from './parse-pain001';

export {
  parsePain008,
  isPain008File,
  type Pain008CollectionItem,
  type Pain008ParseResult,
} from './pain008/parse-pain008';

export {
  generatePain001,
  downloadPain001,
  validatePain001Params,
  type Pain001Payment,
  type Pain001GenerateParams,
  type Pain001ValidationError,
} from './generate-pain001';
