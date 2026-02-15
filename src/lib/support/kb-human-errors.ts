export type HumanIssue = {
  field: string
  message: string
  severity: 'error' | 'warning'
}

function pushIssue(target: HumanIssue[], issue: HumanIssue): void {
  if (target.some(item => item.field === issue.field && item.message === issue.message && item.severity === issue.severity)) {
    return
  }
  target.push(issue)
}

function mapTechnicalErrorToHuman(error: string): HumanIssue {
  if (error.includes('Missing title.es')) {
    return {
      field: 'questionEs',
      message: 'Falta la pregunta en castellà.',
      severity: 'error',
    }
  }

  if (error.includes('Missing title.ca')) {
    return {
      field: 'questionCa',
      message: 'Falta la pregunta en català.',
      severity: 'error',
    }
  }

  if (error.includes('intents.es')) {
    return {
      field: 'questionEs',
      message: 'Cal una intenció en castellà perquè el bot la pugui trobar.',
      severity: 'error',
    }
  }

  if (error.includes('intents.ca')) {
    return {
      field: 'questionCa',
      message: 'Cal una intenció en català perquè el bot la pugui trobar.',
      severity: 'error',
    }
  }

  if (error.includes('answer.es is missing')) {
    return {
      field: 'answerEs',
      message: 'Falta la resposta en castellà.',
      severity: 'error',
    }
  }

  if (error.includes('answer.ca is missing')) {
    return {
      field: 'answerCa',
      message: 'Falta la resposta en català.',
      severity: 'error',
    }
  }

  if (error.includes('Invalid domain') || error.includes('Invalid risk') || error.includes('Invalid guardrail') || error.includes('Invalid answerMode')) {
    return {
      field: 'autoPolicy',
      message: 'Tema o nivell de seguretat no vàlid. Revisa la pregunta i torna-ho a provar.',
      severity: 'error',
    }
  }

  if (error.includes('Missing required fallback card')) {
    return {
      field: 'system',
      message: 'Falta una resposta bàsica del sistema. No es pot publicar fins arreglar-ho.',
      severity: 'error',
    }
  }

  if (error.includes('Eval CA sota mínim') || error.includes('Eval ES sota mínim') || error.includes('Golden critical Top1 sota mínim')) {
    return {
      field: 'quality',
      message: 'La qualitat global del bot ha baixat. Revisa aquesta targeta o una altra de relacionada.',
      severity: 'error',
    }
  }

  if (error.includes('Critical card has no renderable operational steps')) {
    return {
      field: 'quality',
      message: 'Una guia clau ha quedat incompleta. Revisa les targetes crítiques abans de publicar.',
      severity: 'error',
    }
  }

  if (error.includes('Duplicate id')) {
    return {
      field: 'cardId',
      message: 'Ja existeix una targeta amb aquest identificador.',
      severity: 'error',
    }
  }

  return {
    field: 'general',
    message: error,
    severity: 'error',
  }
}

function mapTechnicalWarningToHuman(warning: string): HumanIssue {
  if (warning.includes('answerMode=limited but answer contains risky verbs')) {
    return {
      field: 'answerCa',
      message: 'La resposta conté verbs massa operatius per aquest tipus de consulta sensible.',
      severity: 'warning',
    }
  }

  if (warning.includes('operatives han caigut a fallback')) {
    return {
      field: 'quality',
      message: 'Algunes consultes operatives encara no tenen targeta específica.',
      severity: 'warning',
    }
  }

  return {
    field: 'general',
    message: warning,
    severity: 'warning',
  }
}

export function toHumanIssues(args: {
  errors?: string[]
  warnings?: string[]
  maxErrors?: number
  maxWarnings?: number
}): HumanIssue[] {
  const issues: HumanIssue[] = []
  const errors = (args.errors ?? []).slice(0, args.maxErrors ?? 20)
  const warnings = (args.warnings ?? []).slice(0, args.maxWarnings ?? 10)

  for (const error of errors) {
    pushIssue(issues, mapTechnicalErrorToHuman(error))
  }

  for (const warning of warnings) {
    pushIssue(issues, mapTechnicalWarningToHuman(warning))
  }

  return issues
}
