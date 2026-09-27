from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model() # 1. Получаем текущую модель пользователя Django

class UserRegisterSerializer(serializers.ModelSerializer):
    # 2. Явно объявляем поля паролей, делая их write_only=True. 
    # Это значит: записать в базу их можно, но обратно в JSON-ответе бэкенд их никогда не покажет ради безопасности!
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm'] # 3. Указываем, какие поля ждем от фронтенда

    def validate(self, attrs):
        # 4. Эта функция — валидатор. Проверяет бизнес-логику до записи в базу.
        # Если пароли не совпадают, выкидываем ошибку 400 Bad Request
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Пароли не совпадают!"})
        
        # Проверяем уникальность email. Если такой уже есть в PostgreSQL — от ворот поворот
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Такой E-mail уже существует!"})
            
        return attrs # Если всё круто, возвращаем проверенные данные дальше

    def create(self, validated_data):
        # 5. Эта функция срабатывает, когда мы вызываем serializer.save()
        validated_data.pop('password_confirm') # Удаляем подтверждение пароля, в базе оно не нужно
        
        # Создаем юзера через специальный метод create_user. 
        # Он автоматически хэширует пароль (set_password), превращая '12345' в безопасную абракадабру
        return User.objects.create_user(**validated_data)
