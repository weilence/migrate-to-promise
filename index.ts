import * as fs from 'node:fs'
import process from 'node:process'
import { Project, ts } from 'ts-morph'

const dir = process.argv?.[2]
if (!dir) {
  console.error('Please specify a directory')
  process.exit(1)
}

const project = new Project()
project.addSourceFilesAtPaths(dir)
for (const sourceFile of project.getSourceFiles()) {
  let hasChange = false

  sourceFile.transform((traversal) => {
    const node = traversal.visitChildren()
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.getText() === 'toPromise') {
      hasChange = true
      return ts.factory.createCallExpression(
        ts.factory.createIdentifier('lastValueFrom'),
        [],
        [node.expression.expression],
      )
    }

    return node
  })

  if (!hasChange)
    continue

  const importDeclaration = sourceFile.getImportDeclaration('rxjs')
  if (!importDeclaration) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'rxjs',
      namedImports: ['lastValueFrom'],
    })
  }
  else {
    const index = importDeclaration.getNamedImports().findIndex(namedImport => namedImport.getName() === 'lastValueFrom')
    if (index === -1)
      importDeclaration.addNamedImport('lastValueFrom')
  }
  fs.writeFileSync(sourceFile.getFilePath(), sourceFile.getFullText())
}
