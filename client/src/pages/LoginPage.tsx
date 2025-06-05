import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ForgotPasswordModal from "@/pages/ForgotPassword";
import logoMeC from "@assets/MeC.jpg";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoginLoading, loginError } = useAuth();
  const { toast } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao MeC ONE!",
      });
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Email ou senha incorretos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl animate-slide-in">
          <CardHeader className="text-center pb-2">
            <div className="flex flex-col items-center mb-2">
              <img
                src={logoMeC}
                alt="Logo MeC"
                className="w-full max-w-xs h-auto object-contain rounded-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MeC ONE</h1>
            <p className="text-gray-600 mt-1">Sistema de Gestão Jurídica</p>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600">
                    Lembrar-me
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-primary-600 hover:text-primary-700 p-0"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Esqueci minha senha
                </Button>
              </div>

              {loginError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  Email ou senha incorretos. Tente novamente.
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoginLoading}
              >
                {isLoginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ForgotPasswordModal
          open={showForgotPassword}
          onOpenChange={setShowForgotPassword}
        />
      </div>
    </div>
  );
}
