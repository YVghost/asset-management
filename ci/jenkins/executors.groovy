import jenkins.model.Jenkins

// Una base CI compartida: impedir builds paralelos de diferentes jobs locales.
Jenkins.get().setNumExecutors(1)
Jenkins.get().save()
