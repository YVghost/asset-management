pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
    }

    parameters {
        booleanParam(name: 'FORCE_FAILURE', defaultValue: false,
            description: 'Demostración reversible: falla la etapa 2 después de ejecutar las pruebas reales.')
    }

    environment {
        REPO_URL = 'https://github.com/YVghost/asset-management.git'
        SOURCE_BRANCH = 'mateo_ortega'
        CI = 'true'
    }

    stages {
        stage('1. Integracion al repositorio privado') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    timeout(time: 5, unit: 'MINUTES') {
                        checkout scmGit(
                            branches: [[name: "*/${env.SOURCE_BRANCH}"]],
                            extensions: [[$class: 'CleanBeforeCheckout']],
                            userRemoteConfigs: [[url: env.REPO_URL, credentialsId: 'github-private']]
                        )
                        sh 'git log -1 --format="Commit verificado: %h"'
                    }
                }
            }
        }

        stage('2. Compilacion y pruebas automatizadas') {
            when { expression { currentBuild.currentResult == 'SUCCESS' } }
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    timeout(time: 25, unit: 'MINUTES') {
                        sh 'bash ci/build.sh'
                        script {
                            if (params.FORCE_FAILURE) {
                                error('Fallo controlado de demostración solicitado con FORCE_FAILURE; no se modificó la aplicación.')
                            }
                        }
                    }
                }
            }
            post {
                always {
                    // No abortar la etapa 3 aunque fallen pruebas o falten reportes.
                    catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                        junit testResults: 'target/surefire-reports/TEST-*.xml,frontend/reports/vitest.xml',
                            allowEmptyResults: false, skipMarkingBuildUnstable: true
                        archiveArtifacts artifacts: 'target/*.jar,frontend/dist/**,ci-output/**',
                            allowEmptyArchive: true, fingerprint: true
                    }
                }
            }
        }

        stage('3. Notificacion por Telegram') {
            steps {
                script {
                    def result = currentBuild.currentResult == 'SUCCESS' ? 'SUCCESS' : 'FAILURE'
                    withEnv(["PIPELINE_RESULT=${result}"]) {
                        catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                            withCredentials([
                                string(credentialsId: 'telegram-bot-token', variable: 'TELEGRAM_BOT_TOKEN'),
                                string(credentialsId: 'telegram-chat-id', variable: 'TELEGRAM_CHAT_ID')
                            ]) {
                                // Disponible en la imagen aun si falló el checkout. No interpolar secretos en Groovy.
                                sh 'set +x; python3 /opt/ams-ci/notify_telegram.py'
                            }
                        }
                    }
                    echo "Resultado previo a notificación: ${result}; resultado final: ${currentBuild.currentResult}"
                }
            }
        }
    }
}
