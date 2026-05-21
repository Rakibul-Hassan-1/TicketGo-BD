declare module "sslcommerz-lts" {
  interface SSLCommerzInitData {
    total_amount: number;
    currency: string;
    tran_id: string;
    success_url: string;
    fail_url: string;
    cancel_url: string;
    ipn_url: string;
    shipping_method: string;
    product_name: string;
    product_category: string;
    product_profile: string;
    cus_name: string;
    cus_email: string;
    cus_add1: string;
    cus_city: string;
    cus_country: string;
    cus_phone: string;
  }

  interface SSLCommerzValidationResult {
    status?: string;
  }

  export default class SSLCommerzPayment {
    constructor(storeId: string, storePassword: string, isLive: boolean);
    init(
      data: SSLCommerzInitData,
    ): Promise<{ GatewayPageURL?: string; sessionkey?: string }>;
    validate(data: { val_id: string }): Promise<SSLCommerzValidationResult>;
  }
}
