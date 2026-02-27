pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 1, unit: 'HOURS')
    }


    parameters {
        string(name: 'DOCKER_HUB_USER', defaultValue: 'viateur', description: 'Docker Hub Username')
        string(name: 'DOCKER_HUB_REPO', defaultValue: 'jenkins-simple-web-app', description: 'Docker Hub Repository Name')
        string(name: 'EC2_PUBLIC_IP', defaultValue: '', description: 'Target EC2 Public IP')
        string(name: 'APP_VERSION', defaultValue: '1.0.0', description: 'Application Version')
    }

    environment {
        DOCKER_CREDS      = credentials('registry_creds')
        
        EC2_SSH_CREDS_ID  = credentials('ec2_ssh')
        
        DOCKER_IMAGE      = "${params.DOCKER_HUB_USER}/${params.DOCKER_HUB_REPO}"
        
        APP_MESSAGE       = "Deployment successful via Jenkins Best Practices Pipeline!"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Install') {
            steps {
                echo "Installing dependencies"
                sh 'cd app && npm install'
            }
        }

        stage('Unit Tests') {
            steps {
                echo "Running unit tests"
                sh 'cd app && npm test'
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    echo "Building Docker image: ${DOCKER_IMAGE}:${params.APP_VERSION}"
                    sh "docker build --build-arg APP_VERSION=${params.APP_VERSION} -t ${DOCKER_IMAGE}:${params.APP_VERSION} app/"
                    sh "docker tag ${DOCKER_IMAGE}:${params.APP_VERSION} ${DOCKER_IMAGE}:latest"
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    sh "echo ${DOCKER_CREDS_PSW} | docker login -u ${DOCKER_CREDS_USR} --password-stdin"
                    echo "Pushing image to Docker Hub..."
                    sh "docker push ${DOCKER_IMAGE}:${params.APP_VERSION}"
                    sh "docker push ${DOCKER_IMAGE}:latest"
                }
            }
        }

        stage('Deploy to EC2') {
            when {
                expression { params.EC2_PUBLIC_IP != '' }
            }
            steps {
                sshagent(credentials: [EC2_SSH_CREDS_ID]) {
                    echo "Deploying to ${params.EC2_PUBLIC_IP} via Ansible"
                    sh """
                        ansible-playbook -i infra/ansible/inventory.ini infra/ansible/deploy.yml \
                            -e "TARGET_IP=${params.EC2_PUBLIC_IP}" \
                            -e "IMAGE_NAME=${DOCKER_IMAGE}:latest" \
                            -e "APP_MESSAGE='${APP_MESSAGE}'" \
                            -e "APP_VERSION='${params.APP_VERSION}'" \
                            --ssh-common-args='-o StrictHostKeyChecking=no'
                    """
                }
            }
        }

    }

    post {
        always {
            sh "docker logout || true"
            cleanWs()
        }
        success {
            echo "Successfully deployed version ${params.APP_VERSION} to http://${params.EC2_PUBLIC_IP}"
        }
        failure {
            echo "Pipeline failed. Check build logs."
        }
    }
}
